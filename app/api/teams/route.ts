import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a manager or admin
    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const { name, description } = await req.json();

    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    // Get user's company
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true }
    });

    if (!user?.companyId) {
      return NextResponse.json(
        { error: "User must be associated with a company to create a team" },
        { status: 400 }
      );
    }

    // Create the team
    const team = await db.team.create({
      data: {
        name,
        description,
        companyId: user.companyId,
        members: {
          create: {
            userId: session.user.id,
            role: "MANAGER"
          }
        }
      }
    });

    // Log the team creation
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        resource: "TEAM",
        resourceId: team.id,
        details: {
          name,
          description,
          companyId: user.companyId
        }
      }
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Team creation error:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Build query
    const where: any = {};

    // If user is not an admin, they can only see teams from their company
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (user?.companyId) {
        where.companyId = user.companyId;
      }
    }

    // Get teams
    const teams = await db.team.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            employees: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
