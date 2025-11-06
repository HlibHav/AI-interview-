import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  fetchLatestPlaybookForResearchGoal,
  formatPlaybookForPrompt,
  createEmptyPlaybook,
  fetchPlaybook
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
 * ACE Generator Phase
 * Uses the playbook to generate interview responses/questions.
 * This is the first phase of the ACE framework.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      task, // e.g., "generate_next_question", "respond_to_participant"
      participantResponse,
      currentQuestion,
      transcript,
      researchGoal,
      researchGoalId,
      sessionContext,
      playbookId
    } = body;

    if (!task) {
      return NextResponse.json(
        { error: 'task parameter is required' },
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
    let playbook = null;
    if (playbookId) {
      playbook = await fetchPlaybook(playbookId);
    } else if (researchGoalId) {
      playbook = await fetchLatestPlaybookForResearchGoal(researchGoalId);
    }

    // Create empty playbook if none exists
    if (!playbook) {
      playbook = createEmptyPlaybook(researchGoalId);
    }

    const playbookText = formatPlaybookForPrompt(playbook);

    // Build system prompt based on ACE Generator prompt structure
    const systemPrompt = `You are an expert interviewer conducting a qualitative research interview.
You have access to a curated playbook of strategies, insights, and patterns that have been learned from past interviews.

Your role is to:
- Use the playbook to guide your interview approach
- Apply relevant strategies from the playbook
- Pay attention to common mistakes listed in the playbook and avoid them
- Show your reasoning step-by-step
- Be concise but thorough
- Reference specific bullet IDs from the playbook when they're relevant

# Playbook:

${playbookText}

Instructions:
- Read the playbook carefully and apply relevant strategies
- Pay attention to common mistakes listed in the playbook and avoid them
- Show your reasoning step-by-step
- Be concise but thorough in your analysis
- Reference bullet IDs from the playbook that are relevant to your response`;

    // Build user prompt based on task
    let userPrompt = '';
    let responseFormat: any = { type: 'json_object' };

    if (task === 'generate_next_question') {
      userPrompt = `Research Goal: ${researchGoal || 'not provided'}

Current Question: ${currentQuestion || 'Starting interview'}

Participant Response: ${participantResponse || 'No response yet'}

Full Transcript: ${JSON.stringify(transcript || [], null, 2)}

Based on the playbook and the conversation context, generate your next action.

Return a JSON object with:
{
  "reasoning": "your chain of thought, referencing relevant playbook bullet IDs",
  "bullet_ids": ["ctx-00001", "ctx-00002"], // bullet IDs from playbook that are relevant
  "action": "ask_followup" | "move_to_next" | "clarify" | "end_interview",
  "content": "your question or response text",
  "reason": "why you chose this action"
}`;
    } else if (task === 'respond_to_participant') {
      userPrompt = `Research Goal: ${researchGoal || 'not provided'}

Current Question: ${currentQuestion || 'not provided'}

Participant Response: ${participantResponse}

Full Transcript: ${JSON.stringify(transcript || [], null, 2)}

Based on the participant's response and the playbook, decide how to respond.

Return a JSON object with:
{
  "reasoning": "your chain of thought, referencing relevant playbook bullet IDs",
  "bullet_ids": ["ctx-00001", "ctx-00002"], // bullet IDs from playbook that are relevant
  "action": "ask_followup" | "move_to_next" | "clarify" | "end_interview",
  "content": "your response text",
  "reason": "why you chose this action"
}`;
    } else {
      return NextResponse.json(
        { error: `Unknown task: ${task}` },
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: responseFormat
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({
      success: true,
      result: parsed,
      playbookId: playbook.playbookId,
      playbookVersion: playbook.version
    });
  } catch (error) {
    console.error('[GENERATOR] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate response',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

