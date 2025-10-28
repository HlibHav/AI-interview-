import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  fetchInterviewSession,
  fetchTranscriptDocument,
  normalizeTranscriptEntries,
  renderTranscriptText
} from '@/lib/weaviate/weaviate-session';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type SummarizerRequestBody = {
  transcript?: any;
  researchGoal?: string;
  sessionContext?: Record<string, any>;
  sessionUuid?: string;
  sessionId?: string;
};

function buildSessionContextSummary(context: Record<string, any> | undefined) {
  if (!context) {
    return {};
  }

  const allowedKeys = [
    'sessionId',
    'participantName',
    'participantEmail',
    'targetAudience',
    'durationMinutes',
    'adminEmail'
  ];

  return allowedKeys.reduce<Record<string, any>>((acc, key) => {
    if (context[key] !== undefined) {
      acc[key] = context[key];
    }
    return acc;
  }, {});
}

export async function POST(request: NextRequest) {
  try {
    const body: SummarizerRequestBody = await request.json();

    const sessionId =
      body.sessionId || body.sessionUuid || body.sessionContext?.sessionId || null;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId or sessionUuid is required' },
        { status: 400 }
      );
    }

    let researchGoal = body.researchGoal;
    let transcriptEntries = normalizeTranscriptEntries(body.transcript);

    const sessionRecord = await fetchInterviewSession(sessionId);
    if (sessionRecord) {
      researchGoal = researchGoal || sessionRecord.researchGoal || '';
    }

    if (transcriptEntries.length === 0) {
      const transcriptDocument = await fetchTranscriptDocument(sessionId);
      if (transcriptDocument) {
        transcriptEntries = transcriptDocument.entries;
      }
    }

    if (transcriptEntries.length === 0) {
      return NextResponse.json(
        { error: 'Transcript data not found for summarisation', sessionId },
        { status: 404 }
      );
    }

    const transcriptText = renderTranscriptText(transcriptEntries);
    const sessionContext = {
      ...buildSessionContextSummary(body.sessionContext),
      targetAudience: body.sessionContext?.targetAudience || sessionRecord?.targetAudience || '',
      participantName: body.sessionContext?.participantName || sessionRecord?.participantName || '',
      messageCount: transcriptEntries.length
    };

    if (!openai) {
      return NextResponse.json(
        {
          error:
            'OPENAI_API_KEY is not configured. Unable to generate summary.',
          sessionId
        },
        { status: 500 }
      );
    }

    const systemPrompt = `You summarise qualitative interview transcripts.
- Produce concise summaries (max ~120 words) that capture the participant's main points.
- Clearly highlight notable sentiments, motivations, and challenges.
- Extract 3–5 key themes as short phrases.
- If the transcript mentions no meaningful content, say so explicitly.`;

    const userPrompt = `Research Goal: ${researchGoal || 'not provided'}
Session Context: ${JSON.stringify(sessionContext, null, 2)}

Full Transcript:
${transcriptText}

Please respond with valid JSON in the following shape:
{
  "summary": "string",
  "keyThemes": ["theme1", "..."],
  "sentiment": "positive" | "negative" | "neutral",
  "keywords": ["keyword1", "..."],
  "emotionalTone": "string",
  "insights": ["insight1", "..."]
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_SUMMARIZER_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0]?.message?.content ?? '{}';
    const summary = JSON.parse(responseContent);

    return NextResponse.json({
      success: true,
      sessionId,
      summary,
      tokenUsage: completion.usage
    });
  } catch (error) {
    console.error('Summarizer agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process summarisation request' },
      { status: 500 }
    );
  }
}
