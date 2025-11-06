import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return openaiClient;
}

export type FollowUpOption = {
  type: 'depth' | 'breadth';
  question: string;
  reasoning: string;
  expectedOutcome: string;
};

export type FollowUpPlannerResult = {
  depthOption: FollowUpOption;
  breadthOption: FollowUpOption;
  recommendation: 'depth' | 'breadth' | 'either';
  reasoning: string;
};

/**
 * Dynamic follow-up planner that watches each answer and proposes
 * two candidate follow-ups (depth vs. breadth) so the interviewer can choose intelligently.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      participantResponse,
      currentQuestion,
      researchGoal,
      transcript,
      sessionContext
    } = body;

    if (!participantResponse || typeof participantResponse !== 'string') {
      return NextResponse.json(
        { error: 'participantResponse is required' },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    if (!client) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          sessionId: sessionContext?.sessionId
        },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an expert at planning follow-up questions for research interviews.
After each participant response, generate two follow-up options:

1. **Depth Option**: A question that goes deeper into the current topic, exploring details, motivations, emotions, or specific examples.
   - Example: "Can you tell me more about what made that challenging?"
   - Use when: The response hints at deeper insights, emotions, or complex situations

2. **Breadth Option**: A question that broadens the scope, explores related topics, or moves to a new area.
   - Example: "That's interesting. How does this relate to other aspects of your work?"
   - Use when: The response is sufficient for the current topic, or you want to explore related areas

Provide a recommendation on which type to use, or suggest "either" if both are equally valuable.

Return only valid JSON in this exact format:
{
  "depthOption": {
    "type": "depth",
    "question": "follow-up question text",
    "reasoning": "why this depth question is valuable",
    "expectedOutcome": "what insights this might uncover"
  },
  "breadthOption": {
    "type": "breadth",
    "question": "follow-up question text",
    "reasoning": "why this breadth question is valuable",
    "expectedOutcome": "what insights this might uncover"
  },
  "recommendation": "depth" | "breadth" | "either",
  "reasoning": "overall reasoning for the recommendation"
}`;

    const transcriptContext = Array.isArray(transcript) && transcript.length > 0
      ? `Recent conversation:\n${transcript.slice(-6).map((entry: any) => 
          `${entry.speaker === 'agent' ? 'Interviewer' : 'Participant'}: ${entry.text}`
        ).join('\n')}\n\n`
      : '';

    const researchContext = researchGoal
      ? `Research Goal: ${researchGoal}\n\n`
      : '';

    const currentQuestionContext = currentQuestion
      ? `Current Question Asked: ${currentQuestion}\n\n`
      : '';

    const userPrompt = `${researchContext}${currentQuestionContext}${transcriptContext}
Participant's Response:
"${participantResponse}"

Generate two follow-up options: one for depth (going deeper) and one for breadth (expanding scope).`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as FollowUpPlannerResult;

    // Validate structure
    if (!parsed.depthOption || !parsed.breadthOption) {
      throw new Error('Invalid response structure from OpenAI');
    }

    // Ensure valid recommendation
    if (!['depth', 'breadth', 'either'].includes(parsed.recommendation)) {
      parsed.recommendation = 'either';
    }

    return NextResponse.json({
      success: true,
      result: parsed
    });
  } catch (error) {
    console.error('[FOLLOWUP-PLANNER] Error generating follow-ups:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate follow-up options',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

