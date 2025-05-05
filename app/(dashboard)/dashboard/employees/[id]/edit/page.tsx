import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmployeeForm } from "@/components/employee-form";

export const metadata = {
  title: "Edit Employee",
  description: "Edit employee details",
};

export default async function EditEmployeePage({
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
  
  // Get teams for the company
  const teams = await db.team.findMany({
    where: {
      companyId: employee.companyId
    },
    select: {
      id: true,
      name: true
    },
    orderBy: {
      name: "asc"
    }
  });

  // Format dates for the form
  const formattedEmployee = {
    ...employee,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    hireDate: employee.hireDate?.toISOString() || null,
  };

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Edit Employee"
        text="Update employee information"
      />
      
      <div className="grid gap-8">
        <EmployeeForm 
          teams={teams} 
          initialData={formattedEmployee} 
          isEditing={true} 
        />
      </div>
    </DashboardShell>
  );
}
