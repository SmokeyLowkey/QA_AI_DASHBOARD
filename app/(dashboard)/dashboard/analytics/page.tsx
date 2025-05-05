import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Overview } from "@/components/overview";

export const metadata = {
  title: "Analytics",
  description: "QA performance analytics and insights",
};

export default async function AnalyticsPage() {
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
        heading="Analytics"
        text="Performance analytics and insights"
      />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>
              Monthly performance metrics across all evaluations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Overview />
          </CardContent>
        </Card>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>
                Employees with highest QA scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This section will display top-performing employees based on QA evaluations.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Areas for Improvement</CardTitle>
              <CardDescription>
                Common improvement opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This section will highlight common areas where employees need improvement.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
