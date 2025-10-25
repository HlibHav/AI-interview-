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
    const { fullTranscript, summaries } = await request.json();

    const systemPrompt = `You are a psychologist. Based on this conversation, estimate the participant's openness, conscientiousness, extraversion, agreeableness and neuroticism on a 0–100 scale. Provide a brief justification for each score. If possible, guess the Enneagram type (1–9) with a sentence of reasoning. Output a JSON object with \`traits\` and \`explanation\` fields.

Guidelines:
- Draw from the actual statements made during the interview. Do not rely solely on the emotional delivery.
- If there is insufficient information for a trait, state that the score is uncertain.
- Provide detailed reasoning for each personality trait score.
- Consider both explicit statements and implicit behavioral patterns.`;

    const userPrompt = `Full Interview Transcript: ${fullTranscript}
Session Summaries: ${JSON.stringify(summaries)}

Analyze the participant's personality and provide a comprehensive psychometric profile. Return a JSON object with:
{
  "traits": {
    "openness": {
      "score": number,
      "explanation": "string"
    },
    "conscientiousness": {
      "score": number,
      "explanation": "string"
    },
    "extraversion": {
      "score": number,
      "explanation": "string"
    },
    "agreeableness": {
      "score": number,
      "explanation": "string"
    },
    "neuroticism": {
      "score": number,
      "explanation": "string"
    }
  },
  "enneagram": {
    "type": number,
    "explanation": "string"
  },
  "overallProfile": "string",
  "keyInsights": ["insight1", "insight2"]
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
    const psychometricProfile = JSON.parse(response || '{}');

    // Store psychological profile in Weaviate
    const profileData = {
      sessionId: 'session-' + Date.now(), // You might want to pass this from the request
      openness: psychometricProfile.traits?.openness?.score || 0,
      conscientiousness: psychometricProfile.traits?.conscientiousness?.score || 0,
      extraversion: psychometricProfile.traits?.extraversion?.score || 0,
      agreeableness: psychometricProfile.traits?.agreeableness?.score || 0,
      neuroticism: psychometricProfile.traits?.neuroticism?.score || 0,
      enneagramType: psychometricProfile.enneagram?.type || 0,
      explanation: JSON.stringify(psychometricProfile),
      createdAt: new Date().toISOString()
    };
    
    await storeInWeaviate('PsychProfile', profileData);

    return NextResponse.json({
      success: true,
      profile: psychometricProfile
    });

  } catch (error) {
    console.error('Psychometric agent error:', error);
    return NextResponse.json(
      { error: 'Failed to generate psychometric profile' },
      { status: 500 }
    );
  }
}
