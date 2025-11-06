import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  fetchPlaybook,
  formatPlaybookForPrompt
} from '@/lib/playbook/playbook-storage';

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

/**
 * ACE Reflection Phase
 * Analyzes interview execution to identify what went wrong,
 * what worked, and what strategies need to be added to the playbook.
 * This is the second phase of the ACE framework.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      playbookId,
      interviewTranscript,
      participantResponses,
      interviewerActions,
      researchGoal,
      groundTruthOrExpectedOutcome, // What we expected vs what happened
      executionFeedback, // Any feedback from the interview execution
      sessionOutcome // 'success', 'partial', 'failure', etc.
    } = body;

    if (!playbookId) {
      return NextResponse.json(
        { error: 'playbookId is required' },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    if (!client) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Load playbook
    const playbook = await fetchPlaybook(playbookId);
    if (!playbook) {
      return NextResponse.json(
        { error: 'Playbook not found' },
        { status: 404 }
      );
    }

    const playbookText = formatPlaybookForPrompt(playbook);

    // Build system prompt based on ACE Reflection prompt structure
    const systemPrompt = `You are an expert analyst and educator. Your job is to diagnose what went wrong or what worked well in an interview execution by analyzing the gap between expected outcomes and actual results.

Instructions:
- Carefully analyze the interview execution to identify where it went wrong or what worked well
- Take the execution feedback into account, comparing expected outcomes with actual results
- Identify specific conceptual errors, mistakes, or successful strategies
- Provide actionable insights that could help improve future interviews
- Focus on the root cause, not just surface-level observations
- Be specific about what should have been done differently (or what worked well)
- You will receive bulletpoints that are part of the playbook that was used
- You need to analyze these bulletpoints and give a tag for each: 'helpful', 'harmful', or 'neutral'

Your output should be a JSON object with these exact fields:
{
  "reasoning": "your chain of thought / reasoning / thinking process, detailed analysis and calculations",
  "error_identification": "what specifically went wrong (or what went well)",
  "root_cause_analysis": "why did this occur? What strategy was misunderstood or applied incorrectly?",
  "correct_approach": "what should have been done instead (or what was done correctly)",
  "key_insight": "what strategy, pattern, or principle should be remembered to avoid this error (or replicate this success)",
  "bullet_tags": [
    {"id": "ctx-00001", "tag": "helpful"},
    {"id": "ctx-00002", "tag": "harmful"}
  ]
}`;

    const userPrompt = `# Playbook that was used:

${playbookText}

# Interview Execution:

## Interview Transcript:
${JSON.stringify(interviewTranscript || [], null, 2)}

## Participant Responses:
${JSON.stringify(participantResponses || [], null, 2)}

## Interviewer Actions:
${JSON.stringify(interviewerActions || [], null, 2)}

## Research Goal:
${researchGoal || 'not provided'}

## Expected Outcome / Ground Truth:
${groundTruthOrExpectedOutcome || 'not provided'}

## Execution Feedback:
${executionFeedback || 'none'}

## Session Outcome:
${sessionOutcome || 'unknown'}

Analyze this interview execution and provide your reflection.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({
      success: true,
      reflection: parsed,
      playbookId,
      playbookVersion: playbook.version
    });
  } catch (error) {
    console.error('[REFLECTION] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate reflection',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

