"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  subject: z.string().min(2, {
    message: "Subject must be at least 2 characters.",
  }),
  message: z.string().optional(),
})

interface ShareReportFormProps {
  recording: any
}

export function ShareReportForm({ recording }: ShareReportFormProps) {
  const router = useRouter()
  const [isSharing, setIsSharing] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      subject: `Call Analysis Report: ${recording.title}`,
      message: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSharing(true)

      // Generate HTML for the report
      const reportHtml = generateReportHtml(recording)

      const response = await fetch(`/api/recordings/${recording.id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          subject: values.subject,
          message: values.message,
          reportHtml,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to share report")
      }

      toast({
        title: "Report shared",
        description: `The report has been sent to ${values.email}.`,
      })

      router.push(`/dashboard/recordings/${recording.id}`)
    } catch (error) {
      console.error("Error sharing report:", error)
      toast({
        title: "Error",
        description: "Failed to share report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Share Report</CardTitle>
          <CardDescription>Send the analysis report via email</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Email</FormLabel>
                    <FormControl>
                      <Input placeholder="recipient@example.com" {...field} />
                    </FormControl>
                    <FormDescription>The email address to send the report to.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>The subject line of the email.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Message</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional message to include in the email." {...field} />
                    </FormControl>
                    <FormDescription>Optional message to include in the email.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSharing}>
            {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSharing ? "Sending..." : "Send Report"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Preview of the report that will be sent</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="analysis">
            <TabsList>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
            </TabsList>
            <TabsContent value="analysis">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Summary</h3>
                  <p>{recording.analysis.content.summary}</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Key Strengths</h3>
                  <ul className="list-inside list-disc space-y-2">
                    {recording.analysis.content.strengths.map((strength: string, index: number) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Areas for Improvement</h3>
                  <ul className="list-inside list-disc space-y-2">
                    {recording.analysis.content.improvements.map((improvement: string, index: number) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recommendations</h3>
                  <ul className="list-inside list-disc space-y-2">
                    {recording.analysis.content.recommendations.map((recommendation: string, index: number) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="scorecard">
              {recording.scorecard ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Overall Score</h3>
                      <span className="text-2xl font-bold">{recording.scorecard.overallScore}%</span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Customer Service</h4>
                        <span className="font-bold">{recording.scorecard.customerService}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Product Knowledge</h4>
                        <span className="font-bold">{recording.scorecard.productKnowledge}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Communication Skills</h4>
                        <span className="font-bold">{recording.scorecard.communicationSkills}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Compliance Adherence</h4>
                        <span className="font-bold">{recording.scorecard.complianceAdherence}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <p className="text-center text-muted-foreground">Scorecard not available.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function generateReportHtml(recording: any) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Call Analysis Report: ${recording.title}</h1>
      
      <div style="margin-top: 20px;">
        <h2 style="color: #555;">Summary</h2>
        <p>${recording.analysis.content.summary}</p>
      </div>
      
      <div style="margin-top: 20px;">
        <h2 style="color: #555;">Scorecard</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Metric</th>
            <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Score</th>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">Overall Score</td>
            <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${recording.scorecard.overallScore}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">Customer Service</td>
            <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">${recording.scorecard.customerService}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">Product Knowledge</td>
            <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">${recording.scorecard.productKnowledge}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">Communication Skills</td>
            <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">${recording.scorecard.communicationSkills}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">Compliance Adherence</td>
            <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">${recording.scorecard.complianceAdherence}%</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 20px;">
        <h2 style="color: #555;">Key Strengths</h2>
        <ul>
          ${recording.analysis.content.strengths.map((strength: string) => `<li>${strength}</li>`).join("")}
        </ul>
      </div>
      
      <div style="margin-top: 20px;">
        <h2 style="color: #555;">Areas for Improvement</h2>
        <ul>
          ${recording.analysis.content.improvements.map((improvement: string) => `<li>${improvement}</li>`).join("")}
        </ul>
      </div>
      
      <div style="margin-top: 20px;">
        <h2 style="color: #555;">Recommendations</h2>
        <ul>
          ${recording.analysis.content.recommendations.map((recommendation: string) => `<li>${recommendation}</li>`).join("")}
        </ul>
      </div>
    </div>
  `
}
