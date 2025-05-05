import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmployeesTable } from "@/components/employees-table";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
  // Get user's company
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  });
  
  // Build query
  const where: any = {};
  
  // If user is not an admin, they can only see employees from their company
  if (session.user.role !== "ADMIN" && user?.companyId) {
    where.companyId = user.companyId;
  }
  
  // Get employees
  const employees = await db.employee.findMany({
    where,
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
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
  
  // Convert dates to strings for the component
  const formattedEmployees = employees.map(employee => ({
    ...employee,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    hireDate: employee.hireDate?.toISOString() || null,
  }));
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Employees"
        text="Manage your employees and their recordings."
      />
      <div>
        <EmployeesTable data={formattedEmployees} />
      </div>
    </DashboardShell>
  );
}
