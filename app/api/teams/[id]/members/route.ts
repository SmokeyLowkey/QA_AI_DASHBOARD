import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
    // Admin can view any team, others can only view teams they are a member of or in their company
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      const isMember = await db.teamMember.findFirst({
        where: {
          teamId,
          userId: session.user.id,
        },
      });

      const isInCompany = user?.companyId === team.companyId;

      if (!isMember && !isInCompany) {
        return NextResponse.json(
          { error: "You don't have permission to view this team" },
          { status: 403 }
        );
      }
    }

    // Get team members
    const members = await db.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

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
    const { userId, role } = await req.json();

    // Validate input
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate role
    if (role && !["MEMBER", "MANAGER"].includes(role)) {
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

    // Check if user has permission to add members to this team
    // Admin can add members to any team, managers can only add members to teams they manage
    if (session.user.role !== "ADMIN" && team.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to add members to this team" },
        { status: 403 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member of the team
    const existingMember = await db.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this team" },
        { status: 400 }
      );
    }

    // Add user to team
    const teamMember = await db.teamMember.create({
      data: {
        teamId,
        userId,
        role: role || "MEMBER",
      },
    });

    // Log the addition
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ADD_MEMBER",
        resource: "TEAM",
        resourceId: teamId,
        details: {
          memberId: userId,
          memberName: user.name,
          memberEmail: user.email,
          role: role || "MEMBER",
        },
      },
    });

    return NextResponse.json(teamMember, { status: 201 });
  } catch (error) {
    console.error("Error adding team member:", error);
    return NextResponse.json(
      { error: "Failed to add team member" },
      { status: 500 }
    );
  }
}
