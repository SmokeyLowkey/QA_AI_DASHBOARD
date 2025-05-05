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
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            employees: true,
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

    // Check if user has permission to view this team
    // Admin can view any team, others can only view teams they are a member of or in their company
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      const isMember = team.members.some(member => member.userId === session.user.id);
      const isInCompany = user?.companyId === team.companyId;

      if (!isMember && !isInCompany) {
        return NextResponse.json(
          { error: "You don't have permission to view this team" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const teamId = params.id;
    const { name, description } = await req.json();

    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: "Team name is required" },
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

    // Check if user has permission to update this team
    // Admin can update any team, managers can only update teams they manage
    if (session.user.role !== "ADMIN" && team.members.length === 0) {
      return NextResponse.json(
        { error: "You don't have permission to update this team" },
        { status: 403 }
      );
    }

    // Update team
    const updatedTeam = await db.team.update({
      where: { id: teamId },
      data: {
        name,
        description,
      },
    });

    // Log the update
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        resource: "TEAM",
        resourceId: teamId,
        details: {
          name,
          description,
        },
      },
    });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
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

    // Delete team
    await db.team.delete({
      where: { id: teamId },
    });

    // Log the deletion
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        resource: "TEAM",
        resourceId: teamId,
        details: {
          name: team.name,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
