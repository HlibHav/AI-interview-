import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to store data in Weaviate
async function storeInWeaviate(className: string, data: any) {
  try {
    const response = await fetch('http://localhost:3000/api/weaviate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'store', className, data })
    });
    return await response.json();
  } catch (error) {
    console.error('Weaviate storage error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, researchGoal, sessionContext } = await request.json();

    const systemPrompt = `Summarise the participant's answer in two sentences or fewer. Capture key themes and any emotional tone (e.g., excitement, frustration). Do not add new information. Store the summary and keywords in the vector database.

Guidelines:
- Summaries should be neutral and factual. Do not infer traits or motivations unless explicitly stated.
- Include important details that may be useful for follow‑up questions.
- Extract key themes and sentiment from the response.`;

    const userPrompt = `Research Goal: ${researchGoal}
Session Context: ${JSON.stringify(sessionContext)}
Transcript Segment: ${transcript}

Generate a summary and extract key insights. Return a JSON object with:
{
  "summary": "string",
  "keyThemes": ["theme1", "theme2"],
  "sentiment": "positive" | "negative" | "neutral",
  "keywords": ["keyword1", "keyword2"],
  "emotionalTone": "string",
  "insights": ["insight1", "insight2"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    const summary = JSON.parse(response || '{}');

    // Store interview chunk in Weaviate
    const chunkData = {
      sessionId: sessionContext?.sessionId || 'unknown',
      speaker: 'respondent',
      text: transcript,
      summary: summary.summary || '',
      keywords: summary.keywords || [],
      sentiment: summary.sentiment || 'neutral',
      timestamp: new Date().toISOString()
    };
    
    await storeInWeaviate('InterviewChunk', chunkData);

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Summarizer agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process summarization request' },
      { status: 500 }
    );
  }
}
