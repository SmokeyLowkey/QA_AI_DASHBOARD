import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getSignedDownloadUrl } from "@/lib/s3"
import { transcribeAudio } from "@/lib/assembly-ai"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordingId = params.id

    // Get the recording
    const recording = await db.recording.findUnique({
      where: { id: recordingId },
    })

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    // Check if user has access to this recording
    const userHasAccess =
      recording.uploadedById === session.user.id ||
      (recording.teamId &&
        (await db.teamMember.findFirst({
          where: {
            userId: session.user.id,
            teamId: recording.teamId,
          },
        })))

    if (!userHasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Create or update transcription record
    let transcription = await db.transcription.findUnique({
      where: { recordingId },
    })

    if (transcription) {
      transcription = await db.transcription.update({
        where: { id: transcription.id },
        data: { status: "PROCESSING" },
      })
    } else {
      transcription = await db.transcription.create({
        data: {
          recordingId,
          text: "",
          status: "PROCESSING",
        },
      })
    }

    // Get a signed URL for the recording
    const signedUrl = await getSignedDownloadUrl(recording.s3Key)

    // Start transcription process
    const transcriptionResult = await transcribeAudio(signedUrl)

    if (transcriptionResult.status === "completed") {
      await db.transcription.update({
        where: { id: transcription.id },
        data: {
          text: transcriptionResult.text,
          status: "COMPLETED",
        },
      })

      return NextResponse.json({
        success: true,
        transcription: {
          ...transcription,
          text: transcriptionResult.text,
          status: "COMPLETED",
        },
      })
    } else {
      await db.transcription.update({
        where: { id: transcription.id },
        data: { status: "FAILED" },
      })

      return NextResponse.json(
        {
          error: "Transcription failed",
          details: transcriptionResult.error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error transcribing recording:", error)
    return NextResponse.json({ error: "Failed to transcribe recording" }, { status: 500 })
  }
}
