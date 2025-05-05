import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Employee Details",
  description: "View employee details and recordings",
};

export default async function EmployeeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get employee details
  const employee = await db.employee.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      team: true,
      _count: {
        select: {
          recordings: true,
        },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  // Check if user has access to this employee
  if (session.user.role !== "ADMIN") {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true }
    });

    if (user?.companyId !== employee.companyId) {
      notFound();
    }
  }

  // Get recent recordings
  const recentRecordings = await db.recording.findMany({
    where: { employeeId: params.id },
    include: {
      transcription: {
        select: {
          id: true,
          status: true,
        },
      },
      analysis: {
        select: {
          id: true,
          status: true,
        },
      },
      scorecard: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Get performance metrics
  const performanceMetrics = await db.performanceMetric.findMany({
    where: { employeeId: params.id },
    orderBy: { period: "desc" },
    take: 12, // Last 12 periods
  });

  return (
    <DashboardShell>
      <DashboardHeader
        heading={employee.name}
        text={employee.position || "Employee"}
      >
        <div className="flex space-x-2">
          <Link href={`/dashboard/employees/${employee.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Link href={`/dashboard/recordings/new?employeeId=${employee.id}`}>
            <Button>Upload Recording</Button>
          </Link>
        </div>
      </DashboardHeader>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Employee ID</h3>
                  <p>{employee.employeeId || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{employee.email || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Department</h3>
                  <p>{employee.department || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Position</h3>
                  <p>{employee.position || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Team</h3>
                  <p>{employee.team?.name || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Hire Date</h3>
                  <p>{employee.hireDate ? formatDate(employee.hireDate.toISOString()) : "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
                  <p>{employee.company?.name || "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Added On</h3>
                  <p>{formatDate(employee.createdAt.toISOString())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Recordings</CardTitle>
              <CardDescription>
                The most recent recordings for this employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentRecordings.length > 0 ? (
                <div className="space-y-4">
                  {recentRecordings.map((recording) => (
                    <div key={recording.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <Link
                          href={`/dashboard/recordings/${recording.id}`}
                          className="font-medium hover:underline"
                        >
                          {recording.title || "Untitled Recording"}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(recording.createdAt.toISOString())}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {recording.transcription?.status === "COMPLETED" && (
                          <Badge variant="outline">Transcribed</Badge>
                        )}
                        {recording.analysis?.status === "COMPLETED" && (
                          <Badge variant="outline">Analyzed</Badge>
                        )}
                        {recording.scorecard && (
                          <Badge>Scored</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No recordings found for this employee.
                </p>
              )}
              
              {recentRecordings.length > 0 && (
                <div className="mt-4 text-center">
                  <Link href={`/dashboard/recordings?employeeId=${employee.id}`}>
                    <Button variant="outline" size="sm">View All Recordings</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recordings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Recordings</CardTitle>
              <CardDescription>
                All recordings for this employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentRecordings.length > 0 ? (
                <div className="space-y-4">
                  {recentRecordings.map((recording) => (
                    <div key={recording.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <Link
                          href={`/dashboard/recordings/${recording.id}`}
                          className="font-medium hover:underline"
                        >
                          {recording.title || "Untitled Recording"}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(recording.createdAt.toISOString())}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {recording.transcription?.status === "COMPLETED" && (
                          <Badge variant="outline">Transcribed</Badge>
                        )}
                        {recording.analysis?.status === "COMPLETED" && (
                          <Badge variant="outline">Analyzed</Badge>
                        )}
                        {recording.scorecard && (
                          <Badge>Scored</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No recordings found for this employee.
                </p>
              )}
              
              <div className="mt-4 text-center">
                <Link href={`/dashboard/recordings/new?employeeId=${employee.id}`}>
                  <Button>Upload New Recording</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Performance metrics for this employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performanceMetrics.length > 0 ? (
                <div className="space-y-4">
                  {performanceMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">
                          {metric.period}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Score: {metric.overallScore}
                        </div>
                      </div>
                      <div>
                        <Badge variant={metric.overallScore > 80 ? "default" : metric.overallScore > 60 ? "outline" : "destructive"}>
                          {metric.overallScore > 80 ? "Excellent" : metric.overallScore > 60 ? "Good" : "Needs Improvement"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No performance metrics available for this employee.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
