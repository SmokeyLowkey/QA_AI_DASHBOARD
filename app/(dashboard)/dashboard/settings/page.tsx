import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Settings",
  description: "Manage your account settings",
};

export default async function SettingsPage() {
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

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Settings"
        text="Manage your account settings and preferences"
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your personal account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{user?.name || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{user?.email || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span>{user?.role || "USER"}</span>
              </div>
              {user?.company && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company:</span>
                  <span>{user.company.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            Account settings management will be implemented in future phases of the project.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
