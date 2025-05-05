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

    // Get the recording
    const recording = await db.recording.findUnique({
      where: { id: params.id },
      include: {
        transcription: true,
        employee: true,
      },
    });

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Check if user has access to this recording
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (recording.employee && user?.companyId !== recording.employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    if (!recording.transcription) {
      return NextResponse.json({ error: "Transcription not found" }, { status: 404 });
    }

    // Get transcript segments
    const segments = await db.transcriptSegment.findMany({
      where: { transcriptionId: recording.transcription.id },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({
      transcription: recording.transcription,
      segments,
    });
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcript" },
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

    const { speakerMap, sections, contextNotes } = await req.json();

    // Get the recording
    const recording = await db.recording.findUnique({
      where: { id: params.id },
      include: {
        transcription: true,
        employee: true,
      },
    });

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Check if user has access to this recording
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (recording.employee && user?.companyId !== recording.employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    if (!recording.transcription) {
      return NextResponse.json({ error: "Transcription not found" }, { status: 404 });
    }

    // Update the transcription
    const updatedTranscription = await db.transcription.update({
      where: { id: recording.transcription.id },
      data: {
        speakerMap: speakerMap ? JSON.parse(JSON.stringify(speakerMap)) : undefined,
        sections: sections ? JSON.parse(JSON.stringify(sections)) : undefined,
        contextNotes,
        editedAt: new Date(),
        editedById: session.user.id,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "TRANSCRIPTION",
      resourceId: recording.transcription.id,
      details: { 
        recordingId: recording.id,
        recordingTitle: recording.title,
        employeeId: recording.employeeId,
        employeeName: recording.employee?.name
      }
    });

    return NextResponse.json({ transcription: updatedTranscription });
  } catch (error) {
    console.error("Error updating transcript:", error);
    return NextResponse.json(
      { error: "Failed to update transcript" },
      { status: 500 }
    );
  }
}
