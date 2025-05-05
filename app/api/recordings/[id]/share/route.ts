import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendReportEmail } from "@/lib/email"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recordingId = params.id
    const { email, subject, reportHtml } = await req.json()

    if (!email || !subject || !reportHtml) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the recording
    const recording = await db.recording.findUnique({
      where: { id: recordingId },
      include: { analysis: true },
    })

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    // Check if analysis exists and is completed
    if (!recording.analysis || recording.analysis.status !== "COMPLETED") {
      return NextResponse.json({ error: "Analysis not completed" }, { status: 400 })
    }

    // Send email
    const result = await sendReportEmail({
      to: email,
      subject,
      reportHtml,
      recordingTitle: recording.title,
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Error sharing report:", error)
    return NextResponse.json({ error: "Failed to share report" }, { status: 500 })
  }
}
