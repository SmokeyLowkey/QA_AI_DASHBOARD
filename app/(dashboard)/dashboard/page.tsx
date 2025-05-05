import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { db } from "@/lib/db";

export const metadata = {
  title: "Dashboard",
  description: "Dashboard overview",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get user data with company information
  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      company: true,
    },
  });

  // Get counts for dashboard
  const recordingsCount = await db.recording.count({
    where: {
      uploadedById: session.user.id,
    },
  });

  // For admin users, get pending registrations count
  let pendingUsersCount = 0;
  if (session.user.role === "ADMIN") {
    pendingUsersCount = await db.user.count({
      where: {
        registrationStatus: "PENDING",
      },
    });
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Dashboard"
        text={`Welcome back, ${session.user.name || "User"}!`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">
              Your Recordings
            </h3>
          </div>
          <div className="text-2xl font-bold">{recordingsCount}</div>
          <p className="text-xs text-muted-foreground">
            Total recordings uploaded
          </p>
        </div>

        {user?.company && (
          <div className="rounded-lg border bg-card p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">
                Your Company
              </h3>
            </div>
            <div className="text-2xl font-bold">{user.company.name}</div>
            <p className="text-xs text-muted-foreground">
              {user.company.description || "No description available"}
            </p>
          </div>
        )}

        {session.user.role === "ADMIN" && (
          <div className="rounded-lg border bg-card p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">
                Pending Approvals
              </h3>
            </div>
            <div className="text-2xl font-bold">{pendingUsersCount}</div>
            <p className="text-xs text-muted-foreground">
              Users waiting for approval
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
