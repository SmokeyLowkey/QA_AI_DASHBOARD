import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    // Parse query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const status = url.searchParams.get("status");

    // Build where clause
    const where: any = { employeeId: params.id };
    
    if (status) {
      if (status === "transcribed") {
        where.transcription = {
          status: "COMPLETED"
        };
      } else if (status === "analyzed") {
        where.analysis = {
          status: "COMPLETED"
        };
      } else if (status === "scored") {
        where.scorecard = {
          isNot: null
        };
      }
    }

    // Get recordings
    const recordings = await db.recording.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
      orderBy: { 
        [sortBy]: sortOrder 
      },
      skip,
      take: limit,
    });

    // Get total count
    const total = await db.recording.count({
      where,
    });

    return NextResponse.json({
      recordings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching employee recordings:", error);
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 }
    );
  }
}
