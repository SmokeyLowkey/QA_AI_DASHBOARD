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

    return NextResponse.json({ segments });
  } catch (error) {
    console.error("Error fetching transcript segments:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcript segments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startTime, endTime, text, speakerId, sectionType } = await req.json();

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

    // Create a new segment
    const segment = await db.transcriptSegment.create({
      data: {
        transcriptionId: recording.transcription.id,
        startTime,
        endTime,
        text,
        speakerId,
        sectionType,
        edited: true,
      },
    });

    // Update the transcription
    await db.transcription.update({
      where: { id: recording.transcription.id },
      data: {
        editedAt: new Date(),
        editedById: session.user.id,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "TRANSCRIPT_SEGMENT",
      resourceId: segment.id,
      details: { 
        recordingId: recording.id,
        recordingTitle: recording.title,
        transcriptionId: recording.transcription.id,
        segmentText: text.substring(0, 50) + (text.length > 50 ? "..." : "")
      }
    });

    return NextResponse.json({ segment }, { status: 201 });
  } catch (error) {
    console.error("Error creating transcript segment:", error);
    return NextResponse.json(
      { error: "Failed to create transcript segment" },
      { status: 500 }
    );
  }
}
