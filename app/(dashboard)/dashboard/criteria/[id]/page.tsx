import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { CriteriaFormChecklist } from "@/components/criteria-form-checklist";
import { notFound, redirect } from "next/navigation";

export const metadata = {
  title: "Edit QA Criteria",
  description: "Edit your quality assurance criteria template.",
};

export default async function EditCriteriaPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get the criteria
  const criteria = await db.qACriteria.findUnique({
    where: { id: params.id },
  });

  if (!criteria) {
    return notFound();
  }

  // Check if user has access to this criteria
  if (session.user.role !== "ADMIN" && criteria.createdById !== session.user.id) {
    // Check if user is in the team
    if (criteria.teamId) {
      const userTeam = await db.teamMember.findFirst({
        where: {
          userId: session.user.id,
          teamId: criteria.teamId,
        },
      });

      if (!userTeam) {
        return notFound();
      }
    } else if (!criteria.isPublic) {
      return notFound();
    }
  }

  // Get user's teams
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      teams: {
        include: {
          team: true,
        },
      },
    },
  });

  const teams = user?.teams.map((t) => ({
    id: t.team.id,
    name: t.team.name,
  })) || [];

  // Format criteria for the form
  const formattedCriteria = {
    id: criteria.id,
    name: criteria.name,
    description: criteria.description || undefined,
    isDefault: criteria.isDefault,
    isPublic: criteria.isPublic,
    customerServiceWeight: criteria.customerServiceWeight,
    productKnowledgeWeight: criteria.productKnowledgeWeight,
    communicationSkillsWeight: criteria.communicationSkillsWeight,
    complianceAdherenceWeight: criteria.complianceAdherenceWeight,
    requiredPhrases: criteria.requiredPhrases as string[],
    prohibitedPhrases: criteria.prohibitedPhrases as string[],
    checklistItems: criteria.checklistItems as any[] || [],
    teamId: criteria.teamId || undefined,
  };

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Edit QA Criteria"
        text="Edit your quality assurance criteria template."
      />
      <div>
        <CriteriaFormChecklist criteria={formattedCriteria} teams={teams} />
      </div>
    </DashboardShell>
  );
}
