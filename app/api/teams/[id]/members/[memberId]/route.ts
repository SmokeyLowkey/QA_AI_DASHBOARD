import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const teamId = params.id;
    const memberId = params.memberId;
    const { role } = await req.json();

    // Validate role
    if (!role || !["MEMBER", "MANAGER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
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

    // Check if user has permission to update members in this team
    // Admin can update any team, managers can only update teams they manage
    if (session.user.role !== "ADMIN" && team.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to update members in this team" },
        { status: 403 }
      );
    }

    // Check if team member exists
    const teamMember = await db.teamMember.findUnique({
      where: {
        id: memberId,
        teamId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Prevent users from changing their own role
    if (teamMember.userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Update team member role
    const updatedMember = await db.teamMember.update({
      where: {
        id: memberId,
      },
      data: {
        role,
      },
    });

    // Log the update
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_MEMBER",
        resource: "TEAM",
        resourceId: teamId,
        details: {
          memberId: teamMember.userId,
          memberName: teamMember.user.name,
          memberEmail: teamMember.user.email,
          oldRole: teamMember.role,
          newRole: role,
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const teamId = params.id;
    const memberId = params.memberId;

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

    // Check if user has permission to remove members from this team
    // Admin can remove members from any team, managers can only remove members from teams they manage
    if (session.user.role !== "ADMIN" && team.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to remove members from this team" },
        { status: 403 }
      );
    }

    // Check if team member exists
    const teamMember = await db.teamMember.findUnique({
      where: {
        id: memberId,
        teamId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Prevent users from removing themselves
    if (teamMember.userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the team" },
        { status: 400 }
      );
    }

    // Remove team member
    await db.teamMember.delete({
      where: {
        id: memberId,
      },
    });

    // Log the removal
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REMOVE_MEMBER",
        resource: "TEAM",
        resourceId: teamId,
        details: {
          memberId: teamMember.userId,
          memberName: teamMember.user.name,
          memberEmail: teamMember.user.email,
          role: teamMember.role,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}
