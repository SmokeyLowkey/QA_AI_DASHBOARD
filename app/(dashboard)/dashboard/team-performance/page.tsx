import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { Overview } from "@/components/overview";

export const metadata = {
  title: "Team Performance",
  description: "Monitor and analyze team performance",
};

export default async function TeamPerformancePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user has manager or admin access
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  // Get team members count if user is a manager
  let teamMembersCount = 0;
  let teamName = "";
  
  if (session.user.role === "MANAGER") {
    // Find the team where the user is a manager
    const teamMembership = await db.teamMember.findFirst({
      where: {
        userId: session.user.id,
        role: "MANAGER",
      },
      include: {
        team: true,
      },
    });
    
    if (teamMembership) {
      teamName = teamMembership.team.name;
      
      // Count team members
      teamMembersCount = await db.teamMember.count({
        where: {
          teamId: teamMembership.teamId,
        },
      });
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading={teamName ? `${teamName} Performance` : "Team Performance"}
        text="Monitor and analyze team performance metrics"
      />

      <div className="grid gap-4">
        {teamName && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamMembersCount}</div>
                <p className="text-xs text-muted-foreground">
                  Active members in your team
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>
              Monthly performance metrics for your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Overview />
          </CardContent>
        </Card>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Team Performers</CardTitle>
              <CardDescription>
                Team members with highest QA scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This section will display top-performing team members based on QA evaluations.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Team Improvement Areas</CardTitle>
              <CardDescription>
                Common improvement opportunities for your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This section will highlight common areas where your team needs improvement.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
