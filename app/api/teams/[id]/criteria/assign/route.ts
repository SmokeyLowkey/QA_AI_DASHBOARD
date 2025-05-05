import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const teamId = params.id;
    const url = new URL(req.url);
    const criteriaId = url.searchParams.get("criteriaId");

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
        await db.teamCriteriaAssignment.update({
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
      } else {
        // Already active, just redirect back
        return NextResponse.redirect(new URL(`/dashboard/teams/${teamId}`, req.url));
      }
    } else {
      // Create the assignment
      await db.teamCriteriaAssignment.create({
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
    }

    // Redirect back to team page
    return NextResponse.redirect(new URL(`/dashboard/teams/${teamId}`, req.url));
  } catch (error) {
    console.error("Error assigning criteria to team:", error);
    return NextResponse.json(
      { error: "Failed to assign criteria to team" },
      { status: 500 }
    );
  }
}
