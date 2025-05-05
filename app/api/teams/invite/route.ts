import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a manager or admin
    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const { email, teamId, role } = await req.json();

    // Validate input
    if (!email || !teamId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate role
    if (role && !["USER", "MANAGER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if team exists
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { company: true }
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to invite to this team
    // Admin can invite to any team, manager can only invite to teams in their company
    if (session.user.role === "MANAGER") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (!user?.companyId || user.companyId !== team.companyId) {
        return NextResponse.json(
          { error: "You don't have permission to invite to this team" },
          { status: 403 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // If user exists, check if they're already in the team
      const existingMember = await db.teamMember.findFirst({
        where: {
          userId: existingUser.id,
          teamId
        }
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this team" },
          { status: 400 }
        );
      }

      // Add existing user to the team
      await db.teamMember.create({
        data: {
          userId: existingUser.id,
          teamId,
          role: role || "USER"
        }
      });

      // Send notification to the user
      try {
        await db.notification.create({
          data: {
            userId: existingUser.id,
            type: "TEAM_INVITATION",
            title: "You've been added to a team",
            message: `You have been added to the team "${team.name}" by ${session.user.name || session.user.email}.`,
            actionUrl: "/dashboard/teams"
          }
        });
      } catch (error) {
        console.warn("Failed to create notification:", error);
      }

      // Send email notification
      try {
        // Get email domain from environment variable
        const emailDomain = process.env.RESEND_DOMAIN || "qainsight.digital";
        
        await sendEmail({
          to: email,
          from: `Team Notifications <notifications@${emailDomain}>`,
          subject: `You've been added to ${team.name}`,
          text: `
Hello,

You have been added to the team "${team.name}" by ${session.user.name || session.user.email}.

You can access the team by logging into your account.

Best regards,
The ${team.name} Team
          `
        });
      } catch (error) {
        console.warn("Failed to send email:", error);
      }

      return NextResponse.json({
        message: "User added to team",
        status: "added"
      });
    } else {
      // Create an invitation token
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      // Create invitation record
      await db.invitation.create({
        data: {
          email,
          token,
          expiresAt,
          teamId,
          role: role || "USER",
          invitedById: session.user.id
        }
      });

      // Generate invitation URL
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const inviteUrl = `${baseUrl}/register?invitation=${token}&email=${encodeURIComponent(email)}`;
      
      // Get email domain from environment variable
      const emailDomain = process.env.RESEND_DOMAIN || "qainsight.digital";

      // Send invitation email
      try {
        await sendEmail({
          to: email,
          from: `Team Invitations <invites@${emailDomain}>`,
          subject: `Invitation to join ${team.name}`,
          text: `
Hello,

You have been invited to join the team "${team.name}" by ${session.user.name || session.user.email}.

Click the link below to accept the invitation and create your account:
${inviteUrl}

This invitation will expire in 7 days.

Best regards,
The ${team.name} Team
          `
        });
      } catch (error) {
        console.warn("Failed to send invitation email:", error);
        return NextResponse.json(
          { error: "Failed to send invitation email" },
          { status: 500 }
        );
      }

      // Log the invitation
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "SEND_INVITATION",
          resource: "TEAM",
          resourceId: teamId,
          details: {
            email,
            role: role || "USER",
            teamId,
            teamName: team.name
          }
        }
      });

      return NextResponse.json({
        message: "Invitation sent",
        status: "invited"
      });
    }
  } catch (error) {
    console.error("Team invitation error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
