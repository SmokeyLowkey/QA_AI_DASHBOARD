import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const invitationId = params.id;

    // Get the invitation
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      include: {
        team: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to cancel this invitation
    if (
      session.user.role !== "ADMIN" &&
      invitation.invitedById !== session.user.id
    ) {
      // Check if user is a manager of the team
      const userTeam = await db.teamMember.findFirst({
        where: {
          userId: session.user.id,
          teamId: invitation.teamId,
          role: "MANAGER",
        },
      });

      if (!userTeam) {
        return NextResponse.json(
          { error: "You don't have permission to cancel this invitation" },
          { status: 403 }
        );
      }
    }

    // Delete the invitation
    await db.invitation.delete({
      where: { id: invitationId },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CANCEL_INVITATION",
        resource: "INVITATION",
        resourceId: invitation.id,
        details: {
          email: invitation.email,
          teamId: invitation.teamId,
          teamName: invitation.team.name,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error canceling invitation:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
