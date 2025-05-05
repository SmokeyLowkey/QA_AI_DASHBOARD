import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { UploadRecordingForm } from "@/components/upload-recording-form";

export const metadata = {
  title: "Upload Recording",
  description: "Upload a new recording",
};

export default async function NewRecordingPage({
  searchParams,
}: {
  searchParams: { employeeId?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  
  // Get user's company
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  });
  
  // Get employees for the company
  const employees = await db.employee.findMany({
    where: {
      companyId: user?.companyId || undefined
    },
    select: {
      id: true,
      name: true,
      employeeId: true,
      department: true,
      position: true
    },
    orderBy: {
      name: "asc"
    }
  });
  
  // Get QA criteria for the company
  const criteria = await db.qACriteria.findMany({
    where: {
      OR: [
        { isDefault: true },
        { 
          createdBy: {
            companyId: user?.companyId || undefined
          }
        }
      ]
    },
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true
    },
    orderBy: {
      name: "asc"
    }
  });
  
  // Get selected employee if employeeId is provided
  let selectedEmployee = null;
  if (searchParams.employeeId) {
    selectedEmployee = await db.employee.findUnique({
      where: { id: searchParams.employeeId },
      select: {
        id: true,
        name: true,
        employeeId: true,
        department: true,
        position: true
      }
    });
    
    // Check if employee belongs to user's company
    if (selectedEmployee && session.user.role !== "ADMIN") {
      const employeeDetails = await db.employee.findUnique({
        where: { id: searchParams.employeeId },
        select: { companyId: true }
      });
      
      if (employeeDetails?.companyId !== user?.companyId) {
        selectedEmployee = null;
      }
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Upload Recording"
        text="Upload a new recording for analysis"
      />
      
      <div className="grid gap-8">
        <UploadRecordingForm 
          employees={employees} 
          criteria={criteria}
          selectedEmployeeId={selectedEmployee?.id}
        />
      </div>
    </DashboardShell>
  );
}
