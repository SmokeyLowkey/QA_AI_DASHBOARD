import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/utils";

export async function GET(
  req: Request,
  { params }: { params: { id: string; categoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the category
    const category = await db.qACategory.findUnique({
      where: { id: params.categoryId },
      include: {
        criteria: true,
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check if the category belongs to the specified criteria
    if (category.criteriaId !== params.id) {
      return NextResponse.json(
        { error: "Category not found for this criteria" },
        { status: 404 }
      );
    }

    // Check if user has access to this criteria
    if (session.user.role !== "ADMIN") {
      // User can access if they created it
      if (category.criteria.createdById !== session.user.id) {
        // User can access if it's public
        if (!category.criteria.isPublic) {
          // User can access if they're in the team
          if (category.criteria.teamId) {
            const userTeam = await db.teamMember.findFirst({
              where: {
                userId: session.user.id,
                teamId: category.criteria.teamId,
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

    // Get metrics
    const metrics = await db.qAMetric.findMany({
      where: { categoryId: params.categoryId },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string; categoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      description,
      weight,
      type,
      scaleMin,
      scaleMax,
      scaleLabels,
    } = await req.json();

    // Get the category
    const category = await db.qACategory.findUnique({
      where: { id: params.categoryId },
      include: {
        criteria: true,
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check if the category belongs to the specified criteria
    if (category.criteriaId !== params.id) {
      return NextResponse.json(
        { error: "Category not found for this criteria" },
        { status: 404 }
      );
    }

    // Check if user has access to update this criteria
    if (
      session.user.role !== "ADMIN" &&
      category.criteria.createdById !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if metric name already exists for this category
    const existingMetric = await db.qAMetric.findFirst({
      where: {
        categoryId: params.categoryId,
        name,
      },
    });

    if (existingMetric) {
      return NextResponse.json(
        { error: "A metric with this name already exists" },
        { status: 400 }
      );
    }

    // Validate metric type
    if (!["boolean", "scale", "text"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid metric type. Must be 'boolean', 'scale', or 'text'" },
        { status: 400 }
      );
    }

    // Validate scale metrics
    if (type === "scale") {
      if (scaleMin === undefined || scaleMax === undefined) {
        return NextResponse.json(
          { error: "Scale metrics must include scaleMin and scaleMax" },
          { status: 400 }
        );
      }

      if (scaleMin >= scaleMax) {
        return NextResponse.json(
          { error: "scaleMin must be less than scaleMax" },
          { status: 400 }
        );
      }
    }

    // Create metric
    const metric = await db.qAMetric.create({
      data: {
        categoryId: params.categoryId,
        name,
        description,
        weight,
        type,
        scaleMin: type === "scale" ? scaleMin : undefined,
        scaleMax: type === "scale" ? scaleMax : undefined,
        scaleLabels: scaleLabels
          ? JSON.parse(JSON.stringify(scaleLabels))
          : undefined,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "QA_METRIC",
      resourceId: metric.id,
      details: {
        criteriaId: params.id,
        criteriaName: category.criteria.name,
        categoryId: params.categoryId,
        categoryName: category.name,
        metricName: name,
        metricType: type,
      },
    });

    return NextResponse.json({ metric }, { status: 201 });
  } catch (error) {
    console.error("Error creating metric:", error);
    return NextResponse.json(
      { error: "Failed to create metric" },
      { status: 500 }
    );
  }
}
