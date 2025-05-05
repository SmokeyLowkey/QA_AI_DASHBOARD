import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createS3Folder } from "@/lib/s3";
import { sanitizeForS3, createAuditLog } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");
    const teamId = url.searchParams.get("teamId");
    const search = url.searchParams.get("search");

    // Build filter conditions
    const where: any = {};

    // If user is not an admin, they can only see employees from their company
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (!user?.companyId) {
        return NextResponse.json({ error: "User has no company" }, { status: 400 });
      }

      where.companyId = user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { position: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
      ];
    }

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

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, department, position, employeeId, hireDate, teamId } = await req.json();

    // Get user's company
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { company: true }
    });

    if (!user?.company) {
      return NextResponse.json(
        { error: "User does not belong to a company" },
        { status: 400 }
      );
    }

    // Check if employee with same ID already exists in this company
    if (employeeId) {
      const existingEmployee = await db.employee.findFirst({
        where: {
          companyId: user.company.id,
          employeeId,
        }
      });

      if (existingEmployee) {
        return NextResponse.json(
          { error: "An employee with this ID already exists in your company" },
          { status: 400 }
        );
      }
    }

    // Create sanitized folder name
    const s3FolderName = sanitizeForS3(`${employeeId || name}-${Date.now()}`);
    
    // Create employee record
    const employee = await db.employee.create({
      data: {
        name,
        email,
        department,
        position,
        employeeId,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        teamId: teamId || undefined,
        companyId: user.company.id,
        s3FolderName
      }
    });

    // Create S3 folder for employee
    const folderPath = `companies/${user.company.s3FolderName}/employees/${s3FolderName}`;
    await createS3Folder(folderPath);
    
    // Also create recordings subfolder
    await createS3Folder(`${folderPath}/recordings`);

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "EMPLOYEE",
      resourceId: employee.id,
      details: { 
        employeeName: name,
        employeeEmail: email,
        companyId: user.company.id,
        companyName: user.company.name
      }
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
