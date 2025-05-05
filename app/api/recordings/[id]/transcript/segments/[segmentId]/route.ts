import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/utils";

export async function PUT(
  req: Request,
  { params }: { params: { id: string; segmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startTime, endTime, text, speakerId, sectionType } = await req.json();

    // Get the segment
    const segment = await db.transcriptSegment.findUnique({
      where: { id: params.segmentId },
      include: {
        transcription: {
          include: {
            recording: {
              include: {
                employee: true,
              },
            },
          },
        },
      },
    });

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    // Check if the segment belongs to the specified recording
    if (segment.transcription.recording.id !== params.id) {
      return NextResponse.json({ error: "Segment not found for this recording" }, { status: 404 });
    }

    // Check if user has access to this recording
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (segment.transcription.recording.employee && user?.companyId !== segment.transcription.recording.employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Update the segment
    const updatedSegment = await db.transcriptSegment.update({
      where: { id: params.segmentId },
      data: {
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
      where: { id: segment.transcriptionId },
      data: {
        editedAt: new Date(),
        editedById: session.user.id,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "TRANSCRIPT_SEGMENT",
      resourceId: segment.id,
      details: { 
        recordingId: segment.transcription.recording.id,
        recordingTitle: segment.transcription.recording.title,
        transcriptionId: segment.transcriptionId,
        segmentText: text.substring(0, 50) + (text.length > 50 ? "..." : "")
      }
    });

    return NextResponse.json({ segment: updatedSegment });
  } catch (error) {
    console.error("Error updating transcript segment:", error);
    return NextResponse.json(
      { error: "Failed to update transcript segment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; segmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the segment
    const segment = await db.transcriptSegment.findUnique({
      where: { id: params.segmentId },
      include: {
        transcription: {
          include: {
            recording: {
              include: {
                employee: true,
              },
            },
          },
        },
      },
    });

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    // Check if the segment belongs to the specified recording
    if (segment.transcription.recording.id !== params.id) {
      return NextResponse.json({ error: "Segment not found for this recording" }, { status: 404 });
    }

    // Check if user has access to this recording
    if (session.user.role !== "ADMIN") {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (segment.transcription.recording.employee && user?.companyId !== segment.transcription.recording.employee.companyId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Delete the segment
    await db.transcriptSegment.delete({
      where: { id: params.segmentId },
    });

    // Update the transcription
    await db.transcription.update({
      where: { id: segment.transcriptionId },
      data: {
        editedAt: new Date(),
        editedById: session.user.id,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "TRANSCRIPT_SEGMENT",
      resourceId: segment.id,
      details: { 
        recordingId: segment.transcription.recording.id,
        recordingTitle: segment.transcription.recording.title,
        transcriptionId: segment.transcriptionId,
        segmentText: segment.text.substring(0, 50) + (segment.text.length > 50 ? "..." : "")
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transcript segment:", error);
    return NextResponse.json(
      { error: "Failed to delete transcript segment" },
      { status: 500 }
    );
  }
}
