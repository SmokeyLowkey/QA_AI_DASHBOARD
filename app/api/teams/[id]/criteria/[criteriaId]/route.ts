import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE endpoint to remove a criteria assignment from a team
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; criteriaId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const teamId = params.id;
    const criteriaId = params.criteriaId;

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

    // Check if user has permission to manage this team
    if (session.user.role !== "ADMIN" && team.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to manage this team's criteria" },
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

    // Check if assignment exists
    const assignment = await db.teamCriteriaAssignment.findUnique({
      where: {
        teamId_criteriaId: {
          teamId,
          criteriaId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Criteria is not assigned to this team" },
        { status: 404 }
      );
    }

    // Soft delete the assignment by marking it as inactive
    const updatedAssignment = await db.teamCriteriaAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Log the removal
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REMOVE_CRITERIA_ASSIGNMENT",
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing criteria assignment:", error);
    return NextResponse.json(
      { error: "Failed to remove criteria assignment" },
      { status: 500 }
    );
  }
}
