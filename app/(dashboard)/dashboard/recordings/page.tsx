import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Recordings",
  description: "Manage your recordings",
};

export default async function RecordingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get recordings for the current user
  const recordings = await db.recording.findMany({
    where: {
      uploadedById: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      transcription: {
        select: {
          status: true,
        },
      },
      analysis: {
        select: {
          status: true,
        },
      },
      employee: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <DashboardShell>
      <DashboardHeader heading="Recordings" text="Manage your recordings">
        <Link href="/dashboard/recordings/new">
          <Button>Upload Recording</Button>
        </Link>
      </DashboardHeader>

      <div className="space-y-4">
        {recordings.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <h3 className="mt-4 text-lg font-semibold">No recordings</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                You don&apos;t have any recordings yet. Start by uploading one.
              </p>
              <Link href="/dashboard/recordings/new">
                <Button size="sm" className="relative">
                  Upload Recording
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-md border">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="flex items-center justify-between p-4"
              >
                <div className="grid gap-1">
                  <Link
                    href={`/dashboard/recordings/${recording.id}`}
                    className="font-semibold hover:underline"
                  >
                    {recording.title}
                  </Link>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {formatDate(recording.createdAt)}
                    </div>
                    {recording.employee && (
                      <div className="text-sm text-muted-foreground">
                        Employee: {recording.employee.name}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        Transcription:{" "}
                        <span
                          className={
                            recording.transcription?.status === "COMPLETED"
                              ? "text-green-500"
                              : recording.transcription?.status === "FAILED"
                              ? "text-red-500"
                              : "text-yellow-500"
                          }
                        >
                          {recording.transcription?.status || "PENDING"}
                        </span>
                      </div>
                      <div className="text-sm">
                        Analysis:{" "}
                        <span
                          className={
                            recording.analysis?.status === "COMPLETED"
                              ? "text-green-500"
                              : recording.analysis?.status === "FAILED"
                              ? "text-red-500"
                              : "text-yellow-500"
                          }
                        >
                          {recording.analysis?.status || "PENDING"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <Link href={`/dashboard/recordings/${recording.id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
