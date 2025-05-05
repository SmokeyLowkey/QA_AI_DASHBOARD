import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Overview } from "@/components/overview";
import { RecentRecordings } from "@/components/recent-recordings";
import { DateTimeDisplay } from "@/components/date-time-display";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileAudio, Users, BarChart, Plus } from "lucide-react";

// Function to get recordings by month for the chart
async function getRecordingsByMonth(userId: string) {
  const currentYear = new Date().getFullYear();
  
  // Get all recordings for the current year
  const recordings = await db.recording.findMany({
    where: {
      uploadedById: userId,
      createdAt: {
        gte: new Date(`${currentYear}-01-01`),
        lt: new Date(`${currentYear + 1}-01-01`),
      },
    },
    select: {
      createdAt: true,
    },
  });
  
  // Initialize counts for each month
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyCounts = monthNames.map((name) => ({ name, total: 0 }));
  
  // Count recordings by month
  recordings.forEach((recording) => {
    const month = new Date(recording.createdAt).getMonth();
    monthlyCounts[month].total += 1;
  });
  
  return monthlyCounts;
}

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

  // Get recent recordings
  const recentRecordings = await db.recording.findMany({
    where: {
      uploadedById: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    include: {
      transcription: {
        select: {
          status: true,
        },
      },
      analysis: {
        select: {
          status: true,
        },
      },
    },
  });

  // For managers, get employee count and team data
  let employeesCount = 0;
  let teamsCount = 0;
  let teamMembers: Array<any> = [];

  if (session.user.role === "MANAGER" || session.user.role === "ADMIN") {
    // Get teams where user is a manager
    const teams = await db.team.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
            role: "MANAGER",
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    teamsCount = teams.length;

    // Get total employees in user's teams
    if (teams.length > 0) {
      const teamIds = teams.map(team => team.id);
      
      employeesCount = await db.teamMember.count({
        where: {
          teamId: {
            in: teamIds,
          },
        },
      });

      // Get team members for the first team
      if (teams[0]) {
        teamMembers = await db.teamMember.findMany({
          where: {
            teamId: teams[0].id,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          take: 5,
        });
      }
    }
  }

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <DashboardHeader
          heading="Dashboard"
          text={`Welcome back, ${session.user.name || "User"}!`}
        />
        <div className="mt-4 md:mt-0">
          <DateTimeDisplay />
        </div>
      </div>

      <div className="flex flex-row gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
        <Card className="flex-1 min-w-[240px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Your Recordings
            </CardTitle>
            <FileAudio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordingsCount}</div>
            <p className="text-xs text-muted-foreground">
              Total recordings uploaded
            </p>
          </CardContent>
        </Card>

        {user?.company && (
          <Card className="flex-1 min-w-[240px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Your Company
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.company.name}</div>
              <p className="text-xs text-muted-foreground">
                {user.company.description || "No description available"}
              </p>
            </CardContent>
          </Card>
        )}

        {(session.user.role === "MANAGER" || session.user.role === "ADMIN") && (
          <Card className="flex-1 min-w-[240px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employeesCount}</div>
              <p className="text-xs text-muted-foreground">
                Across {teamsCount} team{teamsCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}

        {session.user.role === "ADMIN" && (
          <Card className="flex-1 min-w-[240px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approvals
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingUsersCount}</div>
              <p className="text-xs text-muted-foreground">
                Users waiting for approval
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Link href="/dashboard/recordings/new" className="group">
          <Card className="h-full w-full transition-all hover:border-primary hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New Recording</CardTitle>
              <FileAudio className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Upload a new call recording for analysis</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/criteria" className="group">
          <Card className="h-full w-full transition-all hover:border-primary hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">QA Criteria</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
              >
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {session.user.role === "MANAGER" || session.user.role === "ADMIN" 
                  ? "View and manage evaluation criteria" 
                  : "View evaluation criteria"}
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/recordings" className="group">
          <Card className="h-full w-full transition-all hover:border-primary hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">All Recordings</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
              >
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Browse and manage all your recordings</p>
            </CardContent>
          </Card>
        </Link>
        
        {(session.user.role === "MANAGER" || session.user.role === "ADMIN") && (
          <Link href="/dashboard/teams" className="group">
            <Card className="h-full w-full transition-all hover:border-primary hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Teams</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Manage your teams and members</p>
              </CardContent>
            </Card>
          </Link>
        )}
        
        {session.user.role === "ADMIN" && (
          <Link href="/dashboard/company-users" className="group">
            <Card className="h-full w-full transition-all hover:border-primary hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Company Users</CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Manage all users in your company</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recording Activity</CardTitle>
            <CardDescription>
              Your recording uploads over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview data={await getRecordingsByMonth(session.user.id)} />
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Recordings</CardTitle>
              <CardDescription>
                Your most recent recording uploads
              </CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/recordings/new">
                <Plus className="mr-2 h-4 w-4" />
                New Recording
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentRecordings recordings={recentRecordings} />
          </CardContent>
        </Card>
      </div>

      {(session.user.role === "MANAGER" || session.user.role === "ADMIN") && teamMembers.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Members in your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center">
                  <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    {member.user.image ? (
                      <img 
                        src={member.user.image} 
                        alt={member.user.name || "Team member"} 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-semibold">
                        {member.user.name?.charAt(0) || "U"}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{member.user.name}</p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                  <div className="ml-auto">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/employees/${member.userId}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
