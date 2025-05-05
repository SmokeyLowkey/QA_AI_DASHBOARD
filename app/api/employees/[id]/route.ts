import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/utils";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if user has access to this employee
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (user?.companyId !== employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Get performance metrics
    const performanceMetrics = await db.performanceMetric.findMany({
      where: { employeeId: params.id },
      orderBy: { period: "desc" },
      take: 12, // Last 12 periods
    });

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

    return NextResponse.json({
      employee,
      performanceMetrics,
      recentRecordings,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, department, position, employeeId, hireDate, teamId } = await req.json();

    // Get the employee
    const employee = await db.employee.findUnique({
      where: { id: params.id },
      include: { company: true }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if user has access to this employee
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (user?.companyId !== employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Check if employee ID is being changed and if it would conflict
    if (employeeId && employeeId !== employee.employeeId) {
      const existingEmployee = await db.employee.findFirst({
        where: {
          companyId: employee.companyId,
          employeeId,
          id: { not: params.id }, // Exclude current employee
        }
      });

      if (existingEmployee) {
        return NextResponse.json(
          { error: "An employee with this ID already exists in your company" },
          { status: 400 }
        );
      }
    }

    // Update employee
    const updatedEmployee = await db.employee.update({
      where: { id: params.id },
      data: {
        name,
        email,
        department,
        position,
        employeeId,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        teamId: teamId || undefined,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "EMPLOYEE",
      resourceId: employee.id,
      details: { 
        employeeName: name,
        employeeEmail: email,
        companyId: employee.companyId,
        companyName: employee.company.name
      }
    });

    return NextResponse.json({ employee: updatedEmployee });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the employee
    const employee = await db.employee.findUnique({
      where: { id: params.id },
      include: { company: true }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if user has access to this employee
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (user?.companyId !== employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Check if employee has recordings
    const recordingsCount = await db.recording.count({
      where: { employeeId: params.id }
    });

    if (recordingsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete employee with recordings. Reassign or delete recordings first." },
        { status: 400 }
      );
    }

    // Delete employee
    await db.employee.delete({
      where: { id: params.id }
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "EMPLOYEE",
      resourceId: employee.id,
      details: { 
        employeeName: employee.name,
        employeeEmail: employee.email,
        companyId: employee.companyId,
        companyName: employee.company.name
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
