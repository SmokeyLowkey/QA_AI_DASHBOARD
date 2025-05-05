import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ShareReportForm } from "@/components/share-report-form"

interface ShareReportPageProps {
  params: {
    id: string
  }
}

export default async function ShareReportPage({ params }: ShareReportPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return null
  }

  const recording = await db.recording.findUnique({
    where: { id: params.id },
    include: {
      analysis: true,
      scorecard: true,
    },
  })

  if (!recording || !recording.analysis || recording.analysis.status !== "COMPLETED") {
    notFound()
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
    notFound()
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Share Report" text={`Share the analysis report for "${recording.title}"`} />
      <ShareReportForm recording={recording} />
    </DashboardShell>
  )
}
