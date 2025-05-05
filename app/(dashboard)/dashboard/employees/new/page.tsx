import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmployeeForm } from "@/components/employee-form";

export const metadata = {
  title: "Add Employee",
  description: "Add a new employee",
};

export default async function NewEmployeePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  
  // Get teams for the company
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  });
  
  const teams = await db.team.findMany({
    where: {
      companyId: user?.companyId || undefined
    },
    select: {
      id: true,
      name: true
    },
    orderBy: {
      name: "asc"
    }
  });

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Add Employee"
        text="Add a new employee to your organization"
      />
      
      <div className="grid gap-8">
        <EmployeeForm teams={teams} />
      </div>
    </DashboardShell>
  );
}
