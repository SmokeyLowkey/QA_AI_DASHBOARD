import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { invitationId } = await req.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Get the invitation
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      include: {
        team: {
          include: {
            company: true,
          },
        },
        invitedBy: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to resend this invitation
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
          { error: "You don't have permission to resend this invitation" },
          { status: 403 }
        );
      }
    }

    // Update the invitation expiry date (extend by 7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const updatedInvitation = await db.invitation.update({
      where: { id: invitationId },
      data: {
        expiresAt,
        updatedAt: new Date(),
      },
    });

    // Send the invitation email
    await sendInvitationEmail({
      email: invitation.email,
      invitedBy: invitation.invitedBy.name || invitation.invitedBy.email || "A team manager",
      teamName: invitation.team.name,
      companyName: invitation.team.company?.name || "Our company",
      invitationLink: `${process.env.NEXTAUTH_URL}/register?invitation=${invitation.token}&email=${encodeURIComponent(invitation.email)}`,
    });

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "RESEND_INVITATION",
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
    console.error("Error resending invitation:", error);
    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
