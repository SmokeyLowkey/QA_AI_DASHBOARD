import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "System Logs",
  description: "View system logs and activity",
};

export default async function LogsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user has admin access
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="System Logs"
        text="View system logs and activity"
      />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
            <CardDescription>
              Recent system events and logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    <span className="text-sm font-medium">System started</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Today, 8:30 AM</span>
                </div>
              </div>
              
              <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                    <span className="text-sm font-medium">Database backup completed</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Today, 3:15 AM</span>
                </div>
              </div>
              
              <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></span>
                    <span className="text-sm font-medium">High CPU usage detected</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Yesterday, 11:42 PM</span>
                </div>
              </div>
              
              <div className="rounded-md bg-gray-100 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                    <span className="text-sm font-medium">Failed login attempts (3)</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Yesterday, 9:17 PM</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Current system status and metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">CPU Usage</p>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "23%" }}></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">23%</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Memory Usage</p>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "45%" }}></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">45%</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Disk Usage</p>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: "72%" }}></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">72%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
