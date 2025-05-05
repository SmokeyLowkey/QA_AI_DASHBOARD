import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Edit, Trash, Copy, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "QA Criteria",
  description: "Manage your quality assurance criteria templates.",
};

export default async function CriteriaPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  
  // Get teamId and assignToTeam from query params
  let teamId: string | undefined;
  let assignToTeam: string | undefined;
  
  if (searchParams && 'teamId' in searchParams) {
    teamId = typeof searchParams.teamId === 'string' ? searchParams.teamId : undefined;
  }
  
  if (searchParams && 'assignToTeam' in searchParams) {
    assignToTeam = typeof searchParams.assignToTeam === 'string' ? searchParams.assignToTeam : undefined;
  }

  if (!session) {
    return null;
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

  const userTeamIds = user?.teams.map((t) => t.team.id) || [];
  
  // If teamId is provided, verify user has access to this team
  if (teamId) {
    const hasAccess = userTeamIds.includes(teamId) || session.user.role === "ADMIN";
    
    if (!hasAccess) {
      // If user doesn't have access to the team, show empty criteria list
      return (
        <DashboardShell>
          <DashboardHeader heading="QA Criteria" text="Manage your quality assurance criteria templates.">
            <Button asChild>
              <Link href="/dashboard/criteria/new">
                <Plus className="mr-2 h-4 w-4" />
                New Criteria
              </Link>
            </Button>
          </DashboardHeader>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>No access to team criteria</CardTitle>
                <CardDescription>
                  You don't have access to view criteria for this team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  You need to be a member of this team to view its criteria.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/dashboard/criteria">
                    View All Criteria
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </DashboardShell>
      );
    }
  }

  // If assignToTeam is provided, verify user has access to this team
  if (assignToTeam) {
    const hasAccess = userTeamIds.includes(assignToTeam) || session.user.role === "ADMIN";
    
    if (!hasAccess) {
      // If user doesn't have access to the team, show empty criteria list
      return (
        <DashboardShell>
          <DashboardHeader heading="QA Criteria" text="Manage your quality assurance criteria templates.">
            <Button asChild>
              <Link href="/dashboard/criteria/new">
                <Plus className="mr-2 h-4 w-4" />
                New Criteria
              </Link>
            </Button>
          </DashboardHeader>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>No access to team</CardTitle>
                <CardDescription>
                  You don't have access to assign criteria to this team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  You need to be a member of this team to assign criteria to it.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/dashboard/criteria">
                    View All Criteria
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </DashboardShell>
      );
    }
  }

  // Get criteria
  const criteria = await db.qACriteria.findMany({
    where: teamId 
      ? { teamId } 
      : {
          OR: [
            { createdById: session.user.id },
            { teamId: { in: userTeamIds } },
            { isPublic: true },
          ],
        },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      categories: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          recordings: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <DashboardShell>
      <DashboardHeader 
        heading={assignToTeam ? "Assign Criteria to Team" : teamId ? "Team QA Criteria" : "QA Criteria"} 
        text={assignToTeam ? "Select criteria templates to assign to this team" : teamId ? "Manage quality assessment criteria for this team" : "Manage your quality assurance criteria templates."}
      >
        <div className="flex gap-2">
          {assignToTeam ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/teams/${assignToTeam}`}>
                Back to Team
              </Link>
            </Button>
          ) : teamId && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/teams/${teamId}`}>
                Back to Team
              </Link>
            </Button>
          )}
          {!assignToTeam && (
            <Button asChild>
              <Link href={teamId ? `/dashboard/criteria/new?teamId=${teamId}` : "/dashboard/criteria/new"}>
                <Plus className="mr-2 h-4 w-4" />
                New Criteria
              </Link>
            </Button>
          )}
        </div>
      </DashboardHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {criteria.map((item) => (
          <Card key={item.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <div className="flex space-x-1">
                  {item.isDefault && (
                    <Badge variant="outline" className="ml-2">
                      Default
                    </Badge>
                  )}
                  {item.isPublic && (
                    <Badge variant="outline" className="ml-2">
                      Public
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                {item.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2 pt-0 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Categories</p>
                  <p className="font-medium">{item.categories.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Used in</p>
                  <p className="font-medium">{item._count.recordings} recordings</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-muted-foreground">Created by</p>
                <p className="font-medium">
                  {item.createdBy.id === session.user.id
                    ? "You"
                    : item.createdBy.name || item.createdBy.email}
                </p>
              </div>
              {item.team && (
                <div className="mt-2">
                  <p className="text-muted-foreground">Team</p>
                  <p className="font-medium">{item.team.name}</p>
                </div>
              )}
              <div className="mt-2">
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(item.createdAt)}</p>
              </div>
            </CardContent>
            <CardFooter className="mt-auto pt-4">
              {assignToTeam ? (
                <Button 
                  className="w-full"
                  asChild
                >
                  <Link href={`/api/teams/${assignToTeam}/criteria/assign?criteriaId=${item.id}`}>
                    Assign to Team
                  </Link>
                </Button>
              ) : (
                <div className="flex w-full justify-between">
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/criteria/${item.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <div className="flex space-x-2">
                    {item._count.recordings === 0 && (
                      <Button variant="outline" size="icon" className="text-destructive">
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardFooter>
          </Card>
        ))}
        {criteria.length === 0 && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>No criteria found</CardTitle>
              <CardDescription>
                You haven't created any QA criteria templates yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Create your first criteria template to start evaluating recordings.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href="/dashboard/criteria/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Criteria
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
