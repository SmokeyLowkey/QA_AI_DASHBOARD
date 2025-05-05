import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/s3";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { TranscriptEditor, type Transcription, type Segment } from "@/components/transcript-editor";

export const metadata = {
  title: "Edit Transcript",
  description: "Edit and enhance the transcript for your recording.",
};

export default async function EditTranscriptPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return notFound();
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
    return notFound();
  }

  // Check if user has access to this recording
  if (session.user.role !== "ADMIN") {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true }
    });

    if (recording.employee && user?.companyId !== recording.employee.companyId) {
      return notFound();
    }
  }

  if (!recording.transcription) {
    return notFound();
  }

  // Get transcript segments
  const dbSegments = await db.transcriptSegment.findMany({
    where: { transcriptionId: recording.transcription.id },
    orderBy: { startTime: "asc" },
  });

  // Get signed URL for audio file
  const audioUrl = await getSignedDownloadUrl(recording.s3Key);

  // Convert DB types to component types
  const transcription: Transcription = {
    id: recording.transcription.id,
    recordingId: recording.transcription.recordingId,
    text: recording.transcription.text,
    status: recording.transcription.status,
    originalText: recording.transcription.originalText || undefined,
    editedAt: recording.transcription.editedAt?.toISOString() || undefined,
    editedById: recording.transcription.editedById || undefined,
    speakerMap: recording.transcription.speakerMap as Record<string, any> || {},
    sections: recording.transcription.sections as Record<string, any> || {},
    contextNotes: recording.transcription.contextNotes || undefined,
    createdAt: recording.transcription.createdAt.toISOString(),
    updatedAt: recording.transcription.updatedAt.toISOString(),
  };

  const segments: Segment[] = dbSegments.map(segment => ({
    id: segment.id,
    transcriptionId: segment.transcriptionId,
    startTime: segment.startTime,
    endTime: segment.endTime,
    text: segment.text,
    speakerId: segment.speakerId || undefined,
    confidence: segment.confidence || undefined,
    edited: segment.edited,
    sectionType: segment.sectionType || undefined,
    createdAt: segment.createdAt.toISOString(),
    updatedAt: segment.updatedAt.toISOString(),
  }));

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Edit Transcript"
        text="Edit and enhance the transcript for better analysis."
      />
      <div className="grid gap-8">
        <TranscriptEditor
          recordingId={recording.id}
          audioUrl={audioUrl}
          transcription={transcription}
          segments={segments}
        />
      </div>
    </DashboardShell>
  );
}
