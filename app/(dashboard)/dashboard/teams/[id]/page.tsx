import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { db } from "@/lib/db";
import { TeamDetailClient } from "@/components/team-detail-client";

export const metadata = {
  title: "Team Details",
  description: "View and manage team details",
};

export default async function TeamDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const teamId = params.id;

  // Get team details
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
              role: true,
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
    redirect("/dashboard/teams");
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
      redirect("/dashboard/teams");
    }
  }

  // Check if user is a manager of this team
  const isManager = 
    session.user.role === "ADMIN" || 
    team.members.some(
      member => member.userId === session.user.id && member.role === "MANAGER"
    );

  // Get users from the same company for adding to the team
  const companyUsers = await db.user.findMany({
    where: {
      companyId: team.companyId,
      // Exclude users who are already team members
      id: {
        notIn: team.members.map(member => member.userId),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Convert dates to strings and ensure all required fields are non-null
  const formattedTeam = {
    ...team,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    members: team.members.map(member => ({
      ...member,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
      user: {
        ...member.user,
        name: member.user.name || member.user.email || 'Unknown User',
        email: member.user.email || '',
      }
    }))
  };

  // Format company users to ensure all required fields are non-null
  const formattedCompanyUsers = companyUsers.map(user => ({
    ...user,
    name: user.name || user.email || 'Unknown User',
    email: user.email || '',
    image: user.image || null,
  }));

  return (
    <DashboardShell>
      <DashboardHeader
        heading={team.name}
        text={`Manage team members and settings`}
      />
      <TeamDetailClient 
        team={formattedTeam} 
        isManager={isManager} 
        companyUsers={formattedCompanyUsers}
        currentUserId={session.user.id}
      />
    </DashboardShell>
  );
}
