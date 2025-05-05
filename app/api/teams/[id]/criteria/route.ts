import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET endpoint to fetch criteria assigned to a team
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const teamId = params.id;

    // Check if team exists
    const team = await db.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to view this team
    if (session.user.role !== "ADMIN") {
      const isMember = await db.teamMember.findFirst({
        where: {
          teamId,
          userId: session.user.id,
        },
      });

      if (!isMember) {
        return NextResponse.json(
          { error: "You don't have permission to view this team's criteria" },
          { status: 403 }
        );
      }
    }

    // Get criteria assigned to the team using raw SQL
    const assignedCriteria = await db.teamCriteriaAssignment.findMany({
      where: {
        teamId,
        isActive: true,
      },
      include: {
        criteria: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            categories: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                recordings: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(assignedCriteria);
  } catch (error) {
    console.error("Error fetching team criteria:", error);
    return NextResponse.json(
      { error: "Failed to fetch team criteria" },
      { status: 500 }
    );
  }
}

// POST endpoint to assign a criteria to a team
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const teamId = params.id;
    const { criteriaId } = await req.json();

    // Validate input
    if (!criteriaId) {
      return NextResponse.json(
        { error: "Criteria ID is required" },
        { status: 400 }
      );
    }

    // Check if team exists
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: {
            userId: session.user.id,
            role: "MANAGER",
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to assign criteria to this team
    if (session.user.role !== "ADMIN" && team.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to assign criteria to this team" },
        { status: 403 }
      );
    }

    // Check if criteria exists
    const criteria = await db.qACriteria.findUnique({
      where: { id: criteriaId },
    });

    if (!criteria) {
      return NextResponse.json(
        { error: "Criteria not found" },
        { status: 404 }
      );
    }

    // Check if criteria is already assigned to the team
    const existingAssignment = await db.teamCriteriaAssignment.findUnique({
      where: {
        teamId_criteriaId: {
          teamId,
          criteriaId,
        },
      },
    });

    if (existingAssignment) {
      // If it exists but is inactive, reactivate it
      if (!existingAssignment.isActive) {
        const updatedAssignment = await db.teamCriteriaAssignment.update({
          where: {
            id: existingAssignment.id,
          },
          data: {
            isActive: true,
            updatedAt: new Date(),
          },
        });

        // Log the reactivation
        await db.auditLog.create({
          data: {
            userId: session.user.id,
            action: "REACTIVATE_CRITERIA_ASSIGNMENT",
            resource: "TEAM",
            resourceId: teamId,
            details: {
              criteriaId,
              criteriaName: criteria.name,
              teamId,
              teamName: team.name,
            },
          },
        });

        return NextResponse.json(updatedAssignment);
      }

      return NextResponse.json(
        { error: "Criteria is already assigned to this team" },
        { status: 400 }
      );
    }

    // Create the assignment
    const assignment = await db.teamCriteriaAssignment.create({
      data: {
        teamId,
        criteriaId,
        isActive: true,
      },
    });

    // Log the assignment
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ASSIGN_CRITERIA",
        resource: "TEAM",
        resourceId: teamId,
        details: {
          criteriaId,
          criteriaName: criteria.name,
          teamId,
          teamName: team.name,
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error assigning criteria to team:", error);
    return NextResponse.json(
      { error: "Failed to assign criteria to team" },
      { status: 500 }
    );
  }
}
