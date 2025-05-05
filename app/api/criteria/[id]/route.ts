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

    const criteria = await db.qACriteria.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          include: {
            metrics: true,
          },
        },
        _count: {
          select: {
            recordings: true,
          },
        },
      },
    });

    if (!criteria) {
      return NextResponse.json({ error: "Criteria not found" }, { status: 404 });
    }

    // Check if user has access to this criteria
    if (session.user.role !== "ADMIN") {
      // User can access if they created it
      if (criteria.createdById === session.user.id) {
        return NextResponse.json({ criteria });
      }

      // User can access if it's public
      if (criteria.isPublic) {
        return NextResponse.json({ criteria });
      }

      // User can access if they're in the team
      if (criteria.teamId) {
        const userTeam = await db.teamMember.findFirst({
          where: {
            userId: session.user.id,
            teamId: criteria.teamId,
          },
        });

        if (userTeam) {
          return NextResponse.json({ criteria });
        }
      }

      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ criteria });
  } catch (error) {
    console.error("Error fetching criteria:", error);
    return NextResponse.json(
      { error: "Failed to fetch criteria" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      description,
      teamId,
      isDefault,
      isPublic,
      customerServiceWeight,
      productKnowledgeWeight,
      communicationSkillsWeight,
      complianceAdherenceWeight,
      requiredPhrases,
      prohibitedPhrases,
      checklistItems,
    } = await req.json();

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

    // Validate weights
    const totalWeight =
      customerServiceWeight +
      productKnowledgeWeight +
      communicationSkillsWeight +
      complianceAdherenceWeight;

    if (totalWeight !== 100) {
      return NextResponse.json(
        { error: "Total weight must equal 100%" },
        { status: 400 }
      );
    }

    // If teamId is provided, check if user has access to the team
    if (teamId && session.user.role !== "ADMIN") {
      const userTeam = await db.teamMember.findFirst({
        where: {
          userId: session.user.id,
          teamId,
        },
      });

      if (!userTeam) {
        return NextResponse.json(
          { error: "You don't have access to this team" },
          { status: 403 }
        );
      }
    }

    // Update criteria
    const updatedCriteria = await db.qACriteria.update({
      where: { id: params.id },
      data: {
        name,
        description,
        teamId: teamId || undefined,
        isDefault: isDefault || false,
        isPublic: isPublic || false,
        customerServiceWeight: customerServiceWeight || 25,
        productKnowledgeWeight: productKnowledgeWeight || 25,
        communicationSkillsWeight: communicationSkillsWeight || 25,
        complianceAdherenceWeight: complianceAdherenceWeight || 25,
        requiredPhrases: requiredPhrases || [],
        prohibitedPhrases: prohibitedPhrases || [],
        checklistItems: checklistItems || [],
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "QA_CRITERIA",
      resourceId: criteria.id,
      details: {
        criteriaName: name,
        teamId,
        isPublic,
      },
    });

    return NextResponse.json({ criteria: updatedCriteria });
  } catch (error) {
    console.error("Error updating criteria:", error);
    return NextResponse.json(
      { error: "Failed to update criteria" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      include: {
        recordings: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!criteria) {
      return NextResponse.json({ error: "Criteria not found" }, { status: 404 });
    }

    // Check if user has access to delete this criteria
    if (session.user.role !== "ADMIN" && criteria.createdById !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if criteria is in use
    if (criteria.recordings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete criteria that is in use by recordings" },
        { status: 400 }
      );
    }

    // Delete all related metrics
    await db.qAMetric.deleteMany({
      where: {
        category: {
          criteriaId: params.id,
        },
      },
    });

    // Delete all related categories
    await db.qACategory.deleteMany({
      where: {
        criteriaId: params.id,
      },
    });

    // Delete the criteria
    await db.qACriteria.delete({
      where: { id: params.id },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "QA_CRITERIA",
      resourceId: criteria.id,
      details: {
        criteriaName: criteria.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting criteria:", error);
    return NextResponse.json(
      { error: "Failed to delete criteria" },
      { status: 500 }
    );
  }
}
