import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const teamId = url.searchParams.get("teamId");
    const includePublic = url.searchParams.get("includePublic") === "true";

    // Build filter conditions
    const where: any = {};

    // If user is not an admin, they can only see criteria from their company or public ones
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        include: {
          teams: {
            select: {
              teamId: true,
            },
          },
        },
      });

      const userTeamIds = user?.teams.map((t) => t.teamId) || [];

      where.OR = [
        { createdById: session.user.id },
        { teamId: { in: userTeamIds } },
      ];

      if (includePublic) {
        where.OR.push({ isPublic: true });
      }
    } else if (teamId) {
      where.teamId = teamId;
    }

    const criteria = await db.qACriteria.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ criteria });
  } catch (error) {
    console.error("Error fetching criteria:", error);
    return NextResponse.json(
      { error: "Failed to fetch criteria" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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
      categories,
    } = await req.json();

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

    // Create criteria
    const criteria = await db.qACriteria.create({
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
        createdById: session.user.id,
      },
    });

    // Create categories and metrics if provided
    if (categories && categories.length > 0) {
      for (const category of categories) {
        const newCategory = await db.qACategory.create({
          data: {
            criteriaId: criteria.id,
            name: category.name,
            description: category.description,
            weight: category.weight,
          },
        });

        if (category.metrics && category.metrics.length > 0) {
          for (const metric of category.metrics) {
            await db.qAMetric.create({
              data: {
                categoryId: newCategory.id,
                name: metric.name,
                description: metric.description,
                weight: metric.weight,
                type: metric.type,
                scaleMin: metric.scaleMin,
                scaleMax: metric.scaleMax,
                scaleLabels: metric.scaleLabels
                  ? JSON.parse(JSON.stringify(metric.scaleLabels))
                  : undefined,
              },
            });
          }
        }
      }
    }

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "QA_CRITERIA",
      resourceId: criteria.id,
      details: {
        criteriaName: name,
        teamId,
        isPublic,
      },
    });

    // Get the complete criteria with categories and metrics
    const completeCriteria = await db.qACriteria.findUnique({
      where: { id: criteria.id },
      include: {
        categories: {
          include: {
            metrics: true,
          },
        },
      },
    });

    return NextResponse.json({ criteria: completeCriteria }, { status: 201 });
  } catch (error) {
    console.error("Error creating criteria:", error);
    return NextResponse.json(
      { error: "Failed to create criteria" },
      { status: 500 }
    );
  }
}
