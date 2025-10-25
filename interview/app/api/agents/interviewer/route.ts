import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to search Weaviate for similar content
async function searchWeaviate(className: string, query: string, limit: number = 5) {
  try {
    const response = await fetch('http://localhost:3000/api/weaviate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'search', 
        className, 
        data: { query, limit, nearText: query } 
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Weaviate search error:', error);
    return { results: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      script, 
      transcript, 
      currentQuestion, 
      participantResponse,
      sessionContext 
    } = await request.json();

    const systemPrompt = `You are a friendly, non‑judgmental interviewer. Introduce yourself, summarise the purpose of the study and ask the first question from the script. After each answer, decide whether to ask a follow‑up or move on. Use active listening cues ("I see", "Can you tell me more about that?"). Respect pauses and only interrupt to clarify. Never share opinions or advice.

Guidelines:
- Maintain a warm and empathetic tone. Do not comment on the content of answers beyond prompting for elaboration.
- If the respondent goes off topic but shares something important, temporarily deviate from the script to explore the insight, then return to the planned questions.
- Use the conversation context to generate appropriate follow-ups.
- Return structured responses with action type and content.`;

    // Search for similar responses in Weaviate for context (optional)
    let similarContext = '';
    try {
      const similarResponses = await searchWeaviate('InterviewChunk', participantResponse, 3);
      similarContext = similarResponses.results?.map((r: any) => r.text).join('\n') || '';
    } catch (error) {
      console.log('Weaviate search skipped:', error);
      similarContext = '';
    }

    const userPrompt = `Interview Script: ${JSON.stringify(script)}
Current Question: ${currentQuestion}
Participant Response: ${participantResponse}
Session Context: ${JSON.stringify(sessionContext)}
Full Transcript: ${transcript}

Similar responses from past interviews: ${similarContext}

Based on the participant's response and similar past responses, decide what to do next. Return a JSON object with:
{
  "action": "ask_followup" | "move_to_next" | "clarify" | "end_interview",
  "content": "string",
  "reason": "string",
  "questionId": "string" (if applicable)
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    
    // Parse the response, handling both JSON and text formats
    let interviewerResponse;
    try {
      // Try to parse as JSON first
      interviewerResponse = JSON.parse(response || '{}');
    } catch (parseError) {
      // If not JSON, create a structured response from text
      interviewerResponse = {
        action: "ask_followup",
        content: response || "I understand. Can you tell me more about that?",
        reason: "Generated from text response",
        questionId: "followup"
      };
    }

    return NextResponse.json({
      success: true,
      response: interviewerResponse
    });

  } catch (error) {
    console.error('Interviewer agent error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: `Failed to process interviewer response: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
