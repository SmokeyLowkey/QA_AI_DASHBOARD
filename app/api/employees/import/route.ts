import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parse } from "papaparse";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a manager or admin
    if (!session || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Get the form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    // Parse the CSV file
    const csvText = await file.text();
    const { data, errors } = parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Invalid CSV format", details: errors },
        { status: 400 }
      );
    }

    // Get the current user's company
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!user?.company) {
      return NextResponse.json(
        { error: "User does not belong to a company" },
        { status: 400 }
      );
    }

    const companyId = user.company.id;

    // Process the CSV data
    const results = {
      success: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 2; // +2 because of 0-indexing and header row

      try {
        // Validate required fields
        if (!row.name || !row.email || !row.position) {
          results.errors.push({
            row: rowNumber,
            error: "Missing required fields (name, email, position)",
          });
          continue;
        }

        // Generate s3FolderName from name
        const s3FolderName = row.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

        // Check if employee already exists
        const existingEmployee = await db.employee.findFirst({
          where: {
            OR: [
              { email: row.email },
              { 
                name: row.name,
                companyId
              }
            ]
          },
        });

        if (existingEmployee) {
          // Update existing employee
          await db.employee.update({
            where: { id: existingEmployee.id },
            data: {
              name: row.name,
              email: row.email,
              position: row.position,
              department: row.department || null,
              hireDate: row.hireDate ? new Date(row.hireDate) : null,
              employeeId: row.employeeId || null,
            },
          });
        } else {
          // Create new employee
          await db.employee.create({
            data: {
              name: row.name,
              email: row.email,
              position: row.position,
              department: row.department || null,
              hireDate: row.hireDate ? new Date(row.hireDate) : null,
              employeeId: row.employeeId || null,
              s3FolderName,
              companyId,
            },
          });
        }

        results.success++;
      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          error: `Failed to process: ${error.message || "Unknown error"}`,
        });
      }
    }

    // Log the import
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "IMPORT_EMPLOYEES",
        resource: "EMPLOYEE",
        resourceId: companyId,
        details: {
          totalRows: data.length,
          successCount: results.success,
          errorCount: results.errors.length,
        },
      },
    });

    return NextResponse.json({
      message: `Imported ${results.success} employees with ${results.errors.length} errors`,
      results,
    });
  } catch (error) {
    console.error("Employee import error:", error);
    return NextResponse.json(
      { error: "Failed to import employees" },
      { status: 500 }
    );
  }
}
