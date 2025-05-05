import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/utils";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the criteria
    const criteria = await db.qACriteria.findUnique({
      where: { id: params.id },
    });

    if (!criteria) {
      return NextResponse.json({ error: "Criteria not found" }, { status: 404 });
    }

    // Check if user has access to this criteria
    if (session.user.role !== "ADMIN") {
      // User can access if they created it
      if (criteria.createdById !== session.user.id) {
        // User can access if it's public
        if (!criteria.isPublic) {
          // User can access if they're in the team
          if (criteria.teamId) {
            const userTeam = await db.teamMember.findFirst({
              where: {
                userId: session.user.id,
                teamId: criteria.teamId,
              },
            });

            if (!userTeam) {
              return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
          } else {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
          }
        }
      }
    }

    // Get categories
    const categories = await db.qACategory.findMany({
      where: { criteriaId: params.id },
      include: {
        metrics: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, weight } = await req.json();

    // Get the criteria
    const criteria = await db.qACriteria.findUnique({
      where: { id: params.id },
    });

    if (!criteria) {
      return NextResponse.json({ error: "Criteria not found" }, { status: 404 });
    }

    // Check if user has access to update this criteria
    if (session.user.role !== "ADMIN" && criteria.createdById !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if category name already exists for this criteria
    const existingCategory = await db.qACategory.findFirst({
      where: {
        criteriaId: params.id,
        name,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 400 }
      );
    }

    // Create category
    const category = await db.qACategory.create({
      data: {
        criteriaId: params.id,
        name,
        description,
        weight,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "QA_CATEGORY",
      resourceId: category.id,
      details: {
        criteriaId: params.id,
        criteriaName: criteria.name,
        categoryName: name,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
