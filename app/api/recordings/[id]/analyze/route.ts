import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { analyzeTranscription } from "@/lib/openai"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordingId = params.id

    // Get the recording with transcription
    const recording = await db.recording.findUnique({
      where: { id: recordingId },
      include: { transcription: true },
    })

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    // Check if transcription exists and is completed
    if (!recording.transcription || recording.transcription.status !== "COMPLETED") {
      return NextResponse.json({ error: "Transcription not completed" }, { status: 400 })
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

    // Create or update analysis record
    let analysis = await db.analysis.findUnique({
      where: { recordingId },
    })

    if (analysis) {
      analysis = await db.analysis.update({
        where: { id: analysis.id },
        data: { status: "PROCESSING" },
      })
    } else {
      analysis = await db.analysis.create({
        data: {
          recordingId,
          content: {},
          status: "PROCESSING",
        },
      })
    }

    // Analyze the transcription
    const analysisResult = await analyzeTranscription(recording.transcription.text)

    // Update the analysis record
    analysis = await db.analysis.update({
      where: { id: analysis.id },
      data: {
        content: analysisResult,
        status: "COMPLETED",
      },
    })

    // Create or update scorecard
    const scorecard = await db.scorecard.upsert({
      where: { recordingId },
      update: {
        overallScore: analysisResult.overallScore,
        customerService: analysisResult.customerService,
        productKnowledge: analysisResult.productKnowledge,
        communicationSkills: analysisResult.communicationSkills,
        complianceAdherence: analysisResult.complianceAdherence,
        notes: analysisResult.summary,
      },
      create: {
        recordingId,
        overallScore: analysisResult.overallScore,
        customerService: analysisResult.customerService,
        productKnowledge: analysisResult.productKnowledge,
        communicationSkills: analysisResult.communicationSkills,
        complianceAdherence: analysisResult.complianceAdherence,
        notes: analysisResult.summary,
      },
    })

    return NextResponse.json({
      success: true,
      analysis,
      scorecard,
    })
  } catch (error) {
    console.error("Error analyzing recording:", error)
    return NextResponse.json({ error: "Failed to analyze recording" }, { status: 500 })
  }
}
