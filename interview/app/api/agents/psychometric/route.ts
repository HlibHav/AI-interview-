import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  fetchInterviewSession,
  fetchTranscriptDocument,
  normalizeTranscriptEntries,
  renderTranscriptText,
  upsertPsychometricProfile
} from '@/lib/weaviate/weaviate-session';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type PsychometricRequestBody = {
  fullTranscript?: any;
  researchGoal?: string;
  summaries?: any[];
  sessionUuid?: string;
  sessionId?: string;
  weaviateSessionId?: string;
};

function extractScore(source: any, trait: string): number {
  const raw = source?.traits?.[trait]?.score;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body: PsychometricRequestBody = await request.json();

    const sessionId = body.sessionId || body.sessionUuid;
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId or sessionUuid is required' },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        {
          error:
            'OPENAI_API_KEY is not configured. Unable to generate psychometric profile.',
          sessionId
        },
        { status: 500 }
      );
    }

    let researchGoal = body.researchGoal;
    let transcriptEntries = normalizeTranscriptEntries(body.fullTranscript);

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
        { error: 'Transcript data not found for psychometric analysis', sessionId },
        { status: 404 }
      );
    }

    const fullTranscriptText = renderTranscriptText(transcriptEntries);

    const summaryList =
      (Array.isArray(body.summaries) && body.summaries.length > 0
        ? body.summaries
        : sessionRecord?.summaries) || [];

    const systemPrompt = `You are an organisational psychologist analysing qualitative interviews.
Return detailed, evidence-backed personality insights using the Big Five model and Enneagram.
Scores must be 0-100 integers. Provide empathetic, grounded explanations citing moments from the transcript.`;

    const userPrompt = `Research Goal: ${researchGoal || 'not provided'}
Summaries: ${JSON.stringify(summaryList, null, 2)}

Full Transcript:
${fullTranscriptText}

Respond with JSON using this schema:
{
  "traits": {
    "openness": { "score": number, "explanation": "string" },
    "conscientiousness": { "score": number, "explanation": "string" },
    "extraversion": { "score": number, "explanation": "string" },
    "agreeableness": { "score": number, "explanation": "string" },
    "neuroticism": { "score": number, "explanation": "string" }
  },
  "enneagram": {
    "type": number,
    "explanation": "string"
  },
  "overallProfile": "string",
  "keyInsights": ["string", "..."]
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_PSYCHOMETRIC_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0]?.message?.content ?? '{}';
    const psychometricProfile = JSON.parse(responseContent);

    console.log('🧠 [PSYCHOMETRIC] Generated profile:', {
      sessionId,
      weaviateSessionId: sessionRecord?.weaviateId,
      profileKeys: Object.keys(psychometricProfile),
      traits: psychometricProfile?.traits ? Object.keys(psychometricProfile.traits) : 'none'
    });

    const profileInput = {
      openness: extractScore(psychometricProfile, 'openness'),
      conscientiousness: extractScore(psychometricProfile, 'conscientiousness'),
      extraversion: extractScore(psychometricProfile, 'extraversion'),
      agreeableness: extractScore(psychometricProfile, 'agreeableness'),
      neuroticism: extractScore(psychometricProfile, 'neuroticism'),
      enneagramType: psychometricProfile?.enneagram?.type
        ? Number(psychometricProfile.enneagram.type)
        : undefined,
      explanation: JSON.stringify(psychometricProfile),
      keyInsights: psychometricProfile?.keyInsights || [],
      overallProfile: psychometricProfile?.overallProfile
    };

    console.log('🧠 [PSYCHOMETRIC] About to upsert PsychProfile:', {
      sessionId,
      weaviateSessionId: sessionRecord?.weaviateId,
      profileInput: {
        openness: profileInput.openness,
        conscientiousness: profileInput.conscientiousness,
        extraversion: profileInput.extraversion,
        agreeableness: profileInput.agreeableness,
        neuroticism: profileInput.neuroticism,
        enneagramType: profileInput.enneagramType,
        explanationLength: profileInput.explanation?.length || 0,
        keyInsightsCount: profileInput.keyInsights?.length || 0
      }
    });

    try {
      const psychProfileId = await upsertPsychometricProfile(
        sessionId,
        profileInput,
        body.weaviateSessionId || sessionRecord?.weaviateId || null
      );

      console.log('✅ [PSYCHOMETRIC] Successfully upserted PsychProfile:', {
        sessionId,
        psychProfileId,
        weaviateSessionId: body.weaviateSessionId || sessionRecord?.weaviateId
      });
    } catch (upsertError) {
      console.error('❌ [PSYCHOMETRIC] Failed to upsert PsychProfile:', {
        sessionId,
        weaviateSessionId: body.weaviateSessionId || sessionRecord?.weaviateId,
        error: upsertError
      });
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      sessionId,
      profile: psychometricProfile,
      tokenUsage: completion.usage
    });
  } catch (error) {
    console.error('Psychometric agent error:', error);
    return NextResponse.json(
      { error: 'Failed to generate psychometric profile' },
      { status: 500 }
    );
  }
}
