import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
})

export async function analyzeTranscription(transcription: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a call center quality assurance expert. Analyze the following sales call transcription and provide a comprehensive assessment. 
        
        Focus on:
        1. Overall call quality (score 0-100)
        2. Customer service (score 0-100)
        3. Product knowledge (score 0-100)
        4. Communication skills (score 0-100)
        5. Compliance adherence (score 0-100)
        6. Key strengths
        7. Areas for improvement
        8. Specific moments of excellence or concern (with timestamps if available)
        9. Actionable recommendations
        
        Format your response as a structured JSON object with the following keys:
        - overallScore
        - customerService
        - productKnowledge
        - communicationSkills
        - complianceAdherence
        - strengths (array)
        - improvements (array)
        - keyMoments (array of objects with timestamp and description)
        - recommendations (array)
        - summary (text)
        `,
      },
      {
        role: "user",
        content: transcription,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  })

  return JSON.parse(response.choices[0].message.content || "{}")
}
