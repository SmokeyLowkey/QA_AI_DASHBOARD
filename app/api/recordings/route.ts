import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { uploadToS3 } from "@/lib/s3"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const teamId = formData.get("teamId") as string
    const employeeId = formData.get("employeeId") as string
    const criteriaId = formData.get("criteriaId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Get user's company
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { company: true }
    })

    if (!user?.company) {
      return NextResponse.json(
        { error: "User does not belong to a company" },
        { status: 400 }
      )
    }

    // Get employee details if provided
    let s3FolderPath = `companies/${user.company.s3FolderName}/recordings`
    let employee = null
    
    if (employeeId) {
      employee = await db.employee.findUnique({
        where: { id: employeeId },
        select: { 
          id: true, 
          name: true, 
          s3FolderName: true,
          companyId: true
        }
      })
      
      // Verify employee belongs to user's company
      if (employee && employee.companyId === user.company.id) {
        s3FolderPath = `companies/${user.company.s3FolderName}/employees/${employee.s3FolderName}/recordings`
      } else {
        return NextResponse.json(
          { error: "Invalid employee ID" },
          { status: 400 }
        )
      }
    }

    // Generate a unique key for S3
    const fileExtension = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExtension}`
    const key = `${s3FolderPath}/${fileName}`

    // Upload to S3
    await uploadToS3(file, key)

    // Handle criteriaId - if it's "default", set it to undefined to use the default criteria
    let finalCriteriaId = undefined;
    if (criteriaId && criteriaId !== "default") {
      // Verify criteria exists and belongs to user's company
      const criteria = await db.qACriteria.findUnique({
        where: { id: criteriaId },
        select: { id: true }
      });
      
      if (criteria) {
        finalCriteriaId = criteriaId;
      }
    }

    // Create recording record in database
    const recording = await db.recording.create({
      data: {
        title,
        description,
        s3Key: key,
        fileSize: file.size,
        fileType: file.type,
        uploadedById: session.user.id,
        teamId: teamId || undefined,
        employeeId: employeeId || undefined,
        criteriaId: finalCriteriaId,
      },
    })

    return NextResponse.json({ recording }, { status: 201 })
  } catch (error) {
    console.error("Error uploading recording:", error)
    return NextResponse.json({ error: "Failed to upload recording" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const teamId = url.searchParams.get("teamId")
    const employeeId = url.searchParams.get("employeeId")
    const search = url.searchParams.get("search")

    // Build where clause
    const where: any = {}
    
    // If user is not an admin, they can only see recordings from their company
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      })
      
      if (user?.companyId) {
        where.OR = [
          { uploadedById: session.user.id },
          { 
            employee: {
              companyId: user.companyId
            } 
          },
          teamId ? { teamId } : {}
        ]
      } else {
        where.uploadedById = session.user.id
      }
    } else {
      // Admin can see all recordings, but can filter
      if (teamId) {
        where.teamId = teamId
      }
    }
    
    // Filter by employee if provided
    if (employeeId) {
      where.employeeId = employeeId
    }
    
    // Search in title or description
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ]
    }

    const recordings = await db.recording.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            position: true,
            department: true,
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
        createdAt: "desc",
      },
    })

    return NextResponse.json({ recordings })
  } catch (error) {
    console.error("Error fetching recordings:", error)
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 })
  }
}
