import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { TeamForm } from "@/components/team-form";

export const metadata = {
  title: "Create Team",
  description: "Create a new team for your organization",
};

export default async function NewTeamPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user has admin or manager access
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Create Team"
        text="Create a new team and invite members"
      />
      <div className="grid gap-8">
        <TeamForm />
      </div>
    </DashboardShell>
  );
}
