import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = {
  title: "Recording Details",
  description: "View recording details",
};

interface RecordingPageProps {
  params: {
    id: string;
  };
}

export default async function RecordingPage({ params }: RecordingPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if the recording exists
  const recording = await db.recording.findUnique({
    where: {
      id: params.id,
    },
    include: {
      transcription: true,
      analysis: true,
      employee: true,
    },
  });

  if (!recording) {
    notFound();
  }

  // Check if the user has access to this recording
  if (recording.uploadedById !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading={recording.title}
        text="Recording details and analysis"
      />

      <div className="grid gap-6">
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-medium mb-4">Recording Information</h3>
          <div className="grid gap-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title:</span>
              <span>{recording.title}</span>
            </div>
            {recording.description && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span>{recording.description}</span>
              </div>
            )}
            {recording.employee && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee:</span>
                <span>{recording.employee.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transcription Status:</span>
              <span>{recording.transcription?.status || "PENDING"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Analysis Status:</span>
              <span>{recording.analysis?.status || "PENDING"}</span>
            </div>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            The full recording details, transcription, and analysis features will be implemented in Phase 2 and Phase 3 of the project.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Link href="/dashboard/recordings">
            <Button variant="outline">Back to Recordings</Button>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
