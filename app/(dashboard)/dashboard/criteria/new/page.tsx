import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { CriteriaFormChecklist } from "@/components/criteria-form-checklist";
import { redirect } from "next/navigation";

export const metadata = {
  title: "New QA Criteria",
  description: "Create a new quality assurance criteria template.",
};

export default async function NewCriteriaPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get teamId from query params
  let teamId: string | undefined;
  if (searchParams && 'teamId' in searchParams) {
    teamId = typeof searchParams.teamId === 'string' ? searchParams.teamId : undefined;
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
  
  // If teamId is provided, verify user has access to this team
  if (teamId) {
    const hasAccess = teams.some(team => team.id === teamId);
    
    if (!hasAccess && session.user.role !== "ADMIN") {
      // If user doesn't have access to the team, redirect to criteria page
      redirect("/dashboard/criteria");
    }
    
    // If teamId is provided but not in user's teams, fetch the team details for admin
    if (!hasAccess && session.user.role === "ADMIN") {
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: { id: true, name: true },
      });
      
      if (team) {
        teams.push({ id: team.id, name: team.name });
      } else {
        // If team doesn't exist, redirect to criteria page
        redirect("/dashboard/criteria");
      }
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Create New QA Criteria"
        text="Create a new quality assurance criteria template for evaluating recordings."
      />
      <div>
        <CriteriaFormChecklist 
          teams={teams} 
          criteria={teamId ? {
            teamId,
            name: "",
            isDefault: false,
            isPublic: false,
            customerServiceWeight: 25,
            productKnowledgeWeight: 25,
            communicationSkillsWeight: 25,
            complianceAdherenceWeight: 25,
            requiredPhrases: [],
            prohibitedPhrases: [],
            checklistItems: []
          } : undefined}
        />
      </div>
    </DashboardShell>
  );
}
