import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { AdminPendingRegistrations } from "@/components/admin-pending-registrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  
  // Get pending registrations
  const pendingUsersData = await db.user.findMany({
    where: { registrationStatus: "PENDING" },
    include: { company: true },
    orderBy: { createdAt: "desc" }
  });
  
  // Convert dates to strings for the component
  const pendingUsers = pendingUsersData.map(user => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  }));
  
  // Get system stats
  const userCount = await db.user.count({
    where: { registrationStatus: "APPROVED" }
  });
  
  const companyCount = await db.company.count();
  
  const recordingCount = await db.recording.count();
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Admin Dashboard"
        text="Manage users, companies, and system settings."
      />
      
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companyCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recordings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recordingCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingUsers.length}</div>
            </CardContent>
          </Card>
        </div>
        
        <AdminPendingRegistrations initialUsers={pendingUsers} />
        
        {/* Other admin components will be added here */}
      </div>
    </DashboardShell>
  );
}
