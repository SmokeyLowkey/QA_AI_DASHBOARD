import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/utils";

export async function PUT(
  req: Request,
  { params }: { params: { id: string; categoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, weight } = await req.json();

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

    // Check if category name already exists for this criteria (if name is being changed)
    if (name !== category.name) {
      const existingCategory = await db.qACategory.findFirst({
        where: {
          criteriaId: params.id,
          name,
          id: { not: params.categoryId },
        },
      });

      if (existingCategory) {
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Update category
    const updatedCategory = await db.qACategory.update({
      where: { id: params.categoryId },
      data: {
        name,
        description,
        weight,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "QA_CATEGORY",
      resourceId: category.id,
      details: {
        criteriaId: params.id,
        criteriaName: category.criteria.name,
        categoryName: name,
      },
    });

    return NextResponse.json({ category: updatedCategory });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        metrics: {
          select: {
            id: true,
          },
        },
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

    // Delete all metrics in this category
    if (category.metrics.length > 0) {
      await db.qAMetric.deleteMany({
        where: {
          categoryId: params.categoryId,
        },
      });
    }

    // Delete the category
    await db.qACategory.delete({
      where: { id: params.categoryId },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "QA_CATEGORY",
      resourceId: category.id,
      details: {
        criteriaId: params.id,
        criteriaName: category.criteria.name,
        categoryName: category.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
