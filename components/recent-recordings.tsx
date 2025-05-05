import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { FileAudio } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface RecentRecordingsProps {
  recordings: any[]
}

export function RecentRecordings({ recordings }: RecentRecordingsProps) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recordings.length > 0 ? (
            recordings.map((recording) => (
              <TableRow key={recording.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/recordings/${recording.id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <FileAudio className="h-4 w-4" />
                    <span className="line-clamp-1">{recording.title}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <RecordingStatus recording={recording} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(recording.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No recordings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function RecordingStatus({ recording }: { recording: any }) {
  if (recording.analysis?.status === "COMPLETED") {
    return <Badge className="bg-green-500 hover:bg-green-600">Analyzed</Badge>
  }

  if (recording.transcription?.status === "COMPLETED") {
    return <Badge className="bg-yellow-500 hover:bg-yellow-600">Transcribed</Badge>
  }

  return <Badge variant="outline">New</Badge>
}
