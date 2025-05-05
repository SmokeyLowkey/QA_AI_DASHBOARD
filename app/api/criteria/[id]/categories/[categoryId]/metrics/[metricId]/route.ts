import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/utils";

export async function PUT(
  req: Request,
  { params }: { params: { id: string; categoryId: string; metricId: string } }
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

    // Get the metric
    const metric = await db.qAMetric.findUnique({
      where: { id: params.metricId },
      include: {
        category: {
          include: {
            criteria: true,
          },
        },
      },
    });

    if (!metric) {
      return NextResponse.json({ error: "Metric not found" }, { status: 404 });
    }

    // Check if the metric belongs to the specified category
    if (metric.categoryId !== params.categoryId) {
      return NextResponse.json(
        { error: "Metric not found for this category" },
        { status: 404 }
      );
    }

    // Check if the category belongs to the specified criteria
    if (metric.category.criteriaId !== params.id) {
      return NextResponse.json(
        { error: "Category not found for this criteria" },
        { status: 404 }
      );
    }

    // Check if user has access to update this criteria
    if (
      session.user.role !== "ADMIN" &&
      metric.category.criteria.createdById !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if metric name already exists for this category (if name is being changed)
    if (name !== metric.name) {
      const existingMetric = await db.qAMetric.findFirst({
        where: {
          categoryId: params.categoryId,
          name,
          id: { not: params.metricId },
        },
      });

      if (existingMetric) {
        return NextResponse.json(
          { error: "A metric with this name already exists" },
          { status: 400 }
        );
      }
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

    // Update metric
    const updatedMetric = await db.qAMetric.update({
      where: { id: params.metricId },
      data: {
        name,
        description,
        weight,
        type,
        scaleMin: type === "scale" ? scaleMin : null,
        scaleMax: type === "scale" ? scaleMax : null,
        scaleLabels: scaleLabels
          ? JSON.parse(JSON.stringify(scaleLabels))
          : null,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "QA_METRIC",
      resourceId: metric.id,
      details: {
        criteriaId: params.id,
        criteriaName: metric.category.criteria.name,
        categoryId: params.categoryId,
        categoryName: metric.category.name,
        metricName: name,
        metricType: type,
      },
    });

    return NextResponse.json({ metric: updatedMetric });
  } catch (error) {
    console.error("Error updating metric:", error);
    return NextResponse.json(
      { error: "Failed to update metric" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; categoryId: string; metricId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the metric
    const metric = await db.qAMetric.findUnique({
      where: { id: params.metricId },
      include: {
        category: {
          include: {
            criteria: true,
          },
        },
      },
    });

    if (!metric) {
      return NextResponse.json({ error: "Metric not found" }, { status: 404 });
    }

    // Check if the metric belongs to the specified category
    if (metric.categoryId !== params.categoryId) {
      return NextResponse.json(
        { error: "Metric not found for this category" },
        { status: 404 }
      );
    }

    // Check if the category belongs to the specified criteria
    if (metric.category.criteriaId !== params.id) {
      return NextResponse.json(
        { error: "Category not found for this criteria" },
        { status: 404 }
      );
    }

    // Check if user has access to update this criteria
    if (
      session.user.role !== "ADMIN" &&
      metric.category.criteria.createdById !== session.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the metric
    await db.qAMetric.delete({
      where: { id: params.metricId },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "QA_METRIC",
      resourceId: metric.id,
      details: {
        criteriaId: params.id,
        criteriaName: metric.category.criteria.name,
        categoryId: params.categoryId,
        categoryName: metric.category.name,
        metricName: metric.name,
        metricType: metric.type,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting metric:", error);
    return NextResponse.json(
      { error: "Failed to delete metric" },
      { status: 500 }
    );
  }
}
