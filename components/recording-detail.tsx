"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { FileAudio, Loader2, Play, Share } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"

interface RecordingDetailProps {
  recording: any
  audioUrl: string
}

export function RecordingDetail({ recording, audioUrl }: RecordingDetailProps) {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleTranscribe = async () => {
    try {
      setIsTranscribing(true)

      const response = await fetch(`/api/recordings/${recording.id}/transcribe`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to transcribe recording")
      }

      toast({
        title: "Transcription complete",
        description: "The recording has been transcribed successfully.",
      })

      // Refresh the page to show the transcription
      window.location.reload()
    } catch (error) {
      console.error("Error transcribing recording:", error)
      toast({
        title: "Error",
        description: "Failed to transcribe recording. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true)

      const response = await fetch(`/api/recordings/${recording.id}/analyze`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to analyze recording")
      }

      toast({
        title: "Analysis complete",
        description: "The recording has been analyzed successfully.",
      })

      // Refresh the page to show the analysis
      window.location.reload()
    } catch (error) {
      console.error("Error analyzing recording:", error)
      toast({
        title: "Error",
        description: "Failed to analyze recording. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            <span className="text-sm text-muted-foreground">
              Uploaded {formatDistanceToNow(new Date(recording.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <RecordingStatus recording={recording} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!recording.transcription || recording.transcription.status !== "COMPLETED" ? (
            <Button onClick={handleTranscribe} disabled={isTranscribing}>
              {isTranscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isTranscribing ? "Transcribing..." : "Transcribe"}
            </Button>
          ) : !recording.analysis || recording.analysis.status !== "COMPLETED" ? (
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/dashboard/recordings/${recording.id}/share`}>
                <Share className="mr-2 h-4 w-4" />
                Share Report
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/dashboard/recordings/${recording.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audio Player</CardTitle>
          <CardDescription>Listen to the recording</CardDescription>
        </CardHeader>
        <CardContent>
          <audio controls className="w-full">
            <source src={audioUrl} type={recording.fileType || "audio/mpeg"} />
            Your browser does not support the audio element.
          </audio>
        </CardContent>
      </Card>

      <Tabs defaultValue="transcription">
        <TabsList>
          <TabsTrigger value="transcription">Transcription</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!recording.analysis || recording.analysis.status !== "COMPLETED"}>
            Analysis
          </TabsTrigger>
          <TabsTrigger value="scorecard" disabled={!recording.scorecard}>
            Scorecard
          </TabsTrigger>
        </TabsList>
        <TabsContent value="transcription">
          <Card>
            <CardHeader>
              <CardTitle>Transcription</CardTitle>
              <CardDescription>
                {recording.transcription?.status === "COMPLETED"
                  ? "Full transcription of the call"
                  : "Transcription not available yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recording.transcription?.status === "COMPLETED" ? (
                <div className="whitespace-pre-wrap">{recording.transcription.text}</div>
              ) : recording.transcription?.status === "PROCESSING" ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-center text-muted-foreground">Transcription in progress...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <Play className="h-8 w-8 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    Click the Transcribe button to generate a transcription.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Analysis</CardTitle>
              <CardDescription>AI-generated analysis of the call</CardDescription>
            </CardHeader>
            <CardContent>
              {recording.analysis?.status === "COMPLETED" ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Summary</h3>
                    <p>{recording.analysis.content.summary}</p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Key Strengths</h3>
                    <ul className="list-inside list-disc space-y-2">
                      {recording.analysis.content.strengths.map((strength: string, index: number) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Areas for Improvement</h3>
                    <ul className="list-inside list-disc space-y-2">
                      {recording.analysis.content.improvements.map((improvement: string, index: number) => (
                        <li key={index}>{improvement}</li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Key Moments</h3>
                    <div className="space-y-2">
                      {recording.analysis.content.keyMoments.map((moment: any, index: number) => (
                        <div key={index} className="rounded-md border p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{moment.timestamp || "N/A"}</span>
                          </div>
                          <p className="mt-1 text-sm">{moment.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Recommendations</h3>
                    <ul className="list-inside list-disc space-y-2">
                      {recording.analysis.content.recommendations.map((recommendation: string, index: number) => (
                        <li key={index}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-center text-muted-foreground">Analysis in progress...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="scorecard">
          <Card>
            <CardHeader>
              <CardTitle>Scorecard</CardTitle>
              <CardDescription>Performance metrics for this call</CardDescription>
            </CardHeader>
            <CardContent>
              {recording.scorecard ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Overall Score</h3>
                      <span className="text-2xl font-bold">{recording.scorecard.overallScore}%</span>
                    </div>
                    <Progress value={recording.scorecard.overallScore} className="h-2" />
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Customer Service</h4>
                        <span className="font-bold">{recording.scorecard.customerService}%</span>
                      </div>
                      <Progress value={recording.scorecard.customerService} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Product Knowledge</h4>
                        <span className="font-bold">{recording.scorecard.productKnowledge}%</span>
                      </div>
                      <Progress value={recording.scorecard.productKnowledge} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Communication Skills</h4>
                        <span className="font-bold">{recording.scorecard.communicationSkills}%</span>
                      </div>
                      <Progress value={recording.scorecard.communicationSkills} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Compliance Adherence</h4>
                        <span className="font-bold">{recording.scorecard.complianceAdherence}%</span>
                      </div>
                      <Progress value={recording.scorecard.complianceAdherence} className="h-2" />
                    </div>
                  </div>

                  {recording.scorecard.notes && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Notes</h3>
                        <p className="text-sm">{recording.scorecard.notes}</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <p className="text-center text-muted-foreground">
                    Scorecard not available yet. Complete the analysis to generate a scorecard.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
