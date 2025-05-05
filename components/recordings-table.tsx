"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { FileAudio, MoreHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/data-table"

interface RecordingsTableProps {
  recordings: any[]
}

export function RecordingsTable({ recordings }: RecordingsTableProps) {
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileAudio className="h-4 w-4" />
          <Link href={`/dashboard/recordings/${row.original.id}`} className="font-medium hover:underline">
            {row.original.title}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <RecordingStatus recording={row.original} />,
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }) => {
        const scorecard = row.original.scorecard
        return scorecard ? (
          <div className="font-medium">{scorecard.overallScore}%</div>
        ) : (
          <div className="text-muted-foreground">N/A</div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Uploaded",
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.createdAt), {
            addSuffix: true,
          })}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/recordings/${row.original.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!row.original.transcription || row.original.transcription.status !== "COMPLETED"}
              asChild
            >
              <Link href={`/dashboard/recordings/${row.original.id}/analyze`}>Analyze</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!row.original.analysis || row.original.analysis.status !== "COMPLETED"} asChild>
              <Link href={`/dashboard/recordings/${row.original.id}/share`}>Share Report</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return <DataTable columns={columns} data={recordings} />
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
