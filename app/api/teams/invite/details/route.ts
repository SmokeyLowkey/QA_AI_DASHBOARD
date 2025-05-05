import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Get the invitation details
    const invitation = await db.invitation.findFirst({
      where: { token },
      include: {
        team: {
          include: {
            company: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const expiresAt = new Date(invitation.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Return invitation details
    return NextResponse.json({
      email: invitation.email,
      team: {
        id: invitation.team.id,
        name: invitation.team.name,
      },
      company: invitation.team.company,
      invitedBy: invitation.invitedBy,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Error getting invitation details:", error);
    return NextResponse.json(
      { error: "Failed to get invitation details" },
      { status: 500 }
    );
  }
}
