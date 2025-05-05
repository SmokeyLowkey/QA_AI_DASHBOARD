import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { CriteriaFormChecklist } from "@/components/criteria-form-checklist";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "QA Criteria Details",
  description: "View quality assurance criteria details.",
};

export default async function CriteriaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get the criteria with related data
  const criteria = await db.qACriteria.findUnique({
    where: { id: params.id },
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
      categories: true,
      _count: {
        select: {
          recordings: true,
        },
      },
    },
  });

  if (!criteria) {
    return notFound();
  }

  // Check if user has access to this criteria
  if (session.user.role !== "ADMIN" && criteria.createdById !== session.user.id) {
    // Check if user is in the team
    if (criteria.teamId) {
      const userTeam = await db.teamMember.findFirst({
        where: {
          userId: session.user.id,
          teamId: criteria.teamId,
        },
      });

      if (!userTeam) {
        return notFound();
      }
    } else if (!criteria.isPublic) {
      return notFound();
    }
  }

  // Get user's teams for the form if user is a manager or admin
  let teams: { id: string; name: string }[] = [];
  
  if (session.user.role === "MANAGER" || session.user.role === "ADMIN") {
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

    teams = user?.teams.map((t) => ({
      id: t.team.id,
      name: t.team.name,
    })) || [];
  }

  // Format criteria for the form
  const formattedCriteria = {
    id: criteria.id,
    name: criteria.name,
    description: criteria.description || undefined,
    isDefault: criteria.isDefault,
    isPublic: criteria.isPublic,
    customerServiceWeight: criteria.customerServiceWeight,
    productKnowledgeWeight: criteria.productKnowledgeWeight,
    communicationSkillsWeight: criteria.communicationSkillsWeight,
    complianceAdherenceWeight: criteria.complianceAdherenceWeight,
    requiredPhrases: criteria.requiredPhrases as string[],
    prohibitedPhrases: criteria.prohibitedPhrases as string[],
    checklistItems: criteria.checklistItems as any[] || [],
    teamId: criteria.teamId || undefined,
  };

  // Check if user can edit (manager or admin)
  const canEdit = session.user.role === "MANAGER" || session.user.role === "ADMIN";

  return (
    <DashboardShell>
      <DashboardHeader
        heading={canEdit ? "Edit QA Criteria" : "QA Criteria Details"}
        text={canEdit ? "Edit your quality assurance criteria template." : "View quality assurance criteria details."}
      >
        <Button asChild variant="outline">
          <Link href="/dashboard/criteria">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Criteria
          </Link>
        </Button>
      </DashboardHeader>
      
      {canEdit ? (
        // Show editable form for managers and admins
        <div>
          <CriteriaFormChecklist criteria={formattedCriteria} teams={teams} />
        </div>
      ) : (
        // Show read-only view for regular users
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{criteria.name}</CardTitle>
                  <CardDescription>
                    {criteria.description || "No description provided"}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  {criteria.isDefault && (
                    <Badge variant="outline">Default</Badge>
                  )}
                  {criteria.isPublic && (
                    <Badge variant="outline">Public</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Created by</h3>
                  <p className="text-sm text-muted-foreground">
                    {criteria.createdBy.name || criteria.createdBy.email}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Created on</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(criteria.createdAt)}
                  </p>
                </div>
                {criteria.team && (
                  <div>
                    <h3 className="text-sm font-medium">Team</h3>
                    <p className="text-sm text-muted-foreground">
                      {criteria.team.name}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium">Used in</h3>
                  <p className="text-sm text-muted-foreground">
                    {criteria._count.recordings} recordings
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="checklist">Checklist Items</TabsTrigger>
              <TabsTrigger value="phrases">Phrases</TabsTrigger>
            </TabsList>
            
            <TabsContent value="checklist" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Evaluation Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(criteria.checklistItems as any[] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No checklist items defined.</p>
                  ) : (
                    <div className="space-y-6">
                      {(criteria.checklistItems as any[] || []).map((section) => (
                        <div key={section.id} className="space-y-2">
                          <h3 className="text-md font-semibold">{section.title}</h3>
                          <div className="space-y-2 pl-4">
                            {section.items.map((item: any) => (
                              <div key={item.id} className="flex items-center">
                                <span className="text-sm">• {item.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="phrases" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Required Phrases</CardTitle>
                </CardHeader>
                <CardContent>
                  {(criteria.requiredPhrases as string[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No required phrases defined.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(criteria.requiredPhrases as string[]).map((phrase, index) => (
                        <Badge key={index} variant="secondary">
                          {phrase}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Prohibited Phrases</CardTitle>
                </CardHeader>
                <CardContent>
                  {(criteria.prohibitedPhrases as string[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No prohibited phrases defined.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(criteria.prohibitedPhrases as string[]).map((phrase, index) => (
                        <Badge key={index} variant="destructive">
                          {phrase}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </DashboardShell>
  );
}
