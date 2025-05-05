import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { db } from "@/lib/db";
import { CompanyUsersClient } from "@/components/company-users-client";

export const metadata = {
  title: "Company Users",
  description: "Manage users in your company",
};

// Main page component
export default async function CompanyUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user has manager or admin access
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  // Get the user's company
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
    },
  });

  if (!user?.company) {
    // If the user doesn't have a company, redirect to dashboard
    redirect("/dashboard");
  }

  const companyId = user.company.id;
  
  // Get all users in the company
  const companyUsers = await db.user.findMany({
    where: {
      companyId: companyId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      registrationStatus: true,
      createdAt: true,
      image: true,
      company: {
        select: {
          id: true,
          name: true,
        }
      }
    },
  });

  // Get pending invitations for the company
  const pendingInvitations = await db.invitation.findMany({
    where: {
      team: {
        companyId: companyId,
      },
      accepted: false,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Count users and pending invitations
  const usersCount = companyUsers.length;
  const pendingInvitationsCount = pendingInvitations.length;

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Company Users"
        text="Manage users in your company"
      />
      
      <CompanyUsersClient 
        initialData={{ 
          users: companyUsers, 
          invitations: pendingInvitations,
          usersCount, 
          pendingInvitationsCount,
          isAdmin: session.user.role === "ADMIN",
        }} 
      />
    </DashboardShell>
  );
}
