import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { db } from "@/lib/db";
import { UserManagementClient } from "@/components/user-management-client";

export const metadata = {
  title: "User Management",
  description: "Manage system users and permissions",
};

// Main page component
export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user has admin access
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Get users data
  const usersCount = await db.user.count();
  const pendingUsersCount = await db.user.count({
    where: {
      registrationStatus: "PENDING",
    },
  });
  
  // Get all users with their details including company
  const users = await db.user.findMany({
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

  return (
    <DashboardShell>
      <DashboardHeader
        heading="User Management"
        text="Manage system users and permissions"
      />
      
      <UserManagementClient 
        initialData={{ 
          users, 
          usersCount, 
          pendingUsersCount 
        }} 
      />
    </DashboardShell>
  );
}
