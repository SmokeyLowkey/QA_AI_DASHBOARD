import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Reports",
  description: "View and generate QA reports",
};

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user has access to this page (admin or manager only)
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Reports"
        text="View and generate QA evaluation reports"
      />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Reports Dashboard</CardTitle>
            <CardDescription>
              Generate and view reports for QA evaluations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is under construction. Soon you'll be able to generate custom reports
              based on evaluation criteria, time periods, and employees.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
