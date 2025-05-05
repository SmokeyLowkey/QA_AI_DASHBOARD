export async function transcribeAudio(audioUrl: string) {
  // Step 1: Submit the audio file for transcription
  const response = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      Authorization: process.env.ASSEMBLY_AI_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
    }),
  })

  const initialData = await response.json()
  const transcriptId = initialData.id

  // Step 2: Poll for the transcription result
  let transcriptionComplete = false
  let transcriptionResult

  while (!transcriptionComplete) {
    await new Promise((resolve) => setTimeout(resolve, 3000)) // Wait 3 seconds between polls

    const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      method: "GET",
      headers: {
        Authorization: process.env.ASSEMBLY_AI_API_KEY!,
      },
    })

    transcriptionResult = await pollingResponse.json()

    if (transcriptionResult.status === "completed" || transcriptionResult.status === "error") {
      transcriptionComplete = true
    }
  }

  return transcriptionResult
}
