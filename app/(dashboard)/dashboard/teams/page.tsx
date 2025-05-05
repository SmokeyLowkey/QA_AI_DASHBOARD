import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { TeamInviteForm } from "@/components/team-invite-form";

export const metadata = {
  title: "Teams",
  description: "Manage teams and team members",
};

export default async function TeamsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user has admin or manager access
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  // Get teams
  const where = session.user.role === "ADMIN" 
    ? {} 
    : { members: { some: { userId: session.user.id } } };
  
  const teams = await db.team.findMany({
    where,
    include: {
      _count: {
        select: {
          members: true,
          employees: true,
        },
      },
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  
  const teamsCount = teams.length;

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Teams"
        text="Manage teams and team members"
      >
        <Button asChild>
          <Link href="/dashboard/teams/new">
            <Plus className="mr-2 h-4 w-4" />
            New Team
          </Link>
        </Button>
      </DashboardHeader>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamsCount}</div>
              <p className="text-xs text-muted-foreground">
                Active teams in the system
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>
              Manage teams and invite team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teams.length > 0 ? (
              <div className="grid gap-4">
                {teams.map((team) => (
                  <Card key={team.id} className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between bg-muted/50 p-4">
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <CardDescription>
                          {team.company?.name}
                        </CardDescription>
                      </div>
                      <TeamInviteForm 
                        teamId={team.id} 
                        teamName={team.name} 
                      />
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {team._count.members} members
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {team._count.employees} employees
                        </div>
                      </div>
                      {team.description && (
                        <p className="mt-2 text-sm">{team.description}</p>
                      )}
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/teams/${team.id}`}>
                          Manage Team
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No teams found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You don't have any teams yet. Create your first team to get started.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/teams/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Team
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
