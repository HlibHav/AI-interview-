import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  fetchPlaybook,
  applyPlaybookOperations,
  upsertPlaybook,
  formatPlaybookForPrompt
} from '@/lib/playbook/playbook-storage';
import type { PlaybookOperation } from '@/lib/playbook/playbook-types';

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
 * ACE Curator Phase
 * Takes reflection insights and incrementally adds new strategies to the playbook.
 * Uses ADD operations to prevent context collapse.
 * This is the third phase of the ACE framework.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      playbookId,
      reflection, // Output from Reflection phase
      researchGoalId,
      researchGoalWeaviateId,
      questionContext, // Context about the interview question/task
      tokenBudget, // Optional token budget
      currentStep, // Optional training progress
      totalSamples // Optional total samples
    } = body;

    if (!playbookId) {
      return NextResponse.json(
        { error: 'playbookId is required' },
        { status: 400 }
      );
    }

    if (!reflection) {
      return NextResponse.json(
        { error: 'reflection is required' },
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

    // Load current playbook
    const currentPlaybook = await fetchPlaybook(playbookId);
    if (!currentPlaybook) {
      return NextResponse.json(
        { error: 'Playbook not found' },
        { status: 404 }
      );
    }

    const playbookText = formatPlaybookForPrompt(currentPlaybook);

    // Calculate playbook stats
    const playbookStats = {
      totalStrategies: currentPlaybook.metadata.totalStrategies,
      totalBullets: currentPlaybook.metadata.totalBullets,
      sections: currentPlaybook.sections.map((s) => ({
        name: s.sectionName,
        bulletCount: s.bullets.length
      }))
    };

    // Build system prompt based on ACE Curator prompt structure
    const systemPrompt = `You are a master curator of knowledge. Your job is to identify what new insights should be added to an existing playbook based on a reflection from a previous interview attempt.

Context:
- The playbook you create will be used to help conduct future interviews
- The reflection is generated using execution feedback that will NOT be available when the playbook is being used
- So you need to come up with content that can aid the playbook user to conduct interviews that likely align with successful outcomes

# CRITICAL: You MUST respond with valid JSON only. Do not use markdown formatting or code blocks.

Instructions:
- Review the existing playbook and the reflection from the previous attempt
- Identify ONLY the NEW insights, strategies, or mistakes that are MISSING from the current playbook
- Avoid redundancy - if similar advice already exists, only add new content that is a perfect complement to the existing playbook
- Do NOT regenerate the entire playbook - only provide the additions needed
- Focus on quality over quantity - a focused, well-organized playbook is better than an exhaustive one
- Format your response as a PURE JSON object with specific sections
- For any operation if no new content to add, return an empty list for the operations field
- Be concise and specific - each addition should be actionable

Available Sections:
- strategies_and_hard_rules: Hard rules and strategies that must be followed
- effective_followup_patterns: Patterns for effective follow-up questions
- common_participant_responses: Common responses and how to handle them
- red_flags_to_watch_for: Warning signs during interviews
- clarification_techniques: Techniques for clarifying ambiguous responses
- topic_transition_strategies: Strategies for transitioning between topics
- emotion_handling_guidelines: Guidelines for handling participant emotions
- contradiction_resolution: How to handle contradictions in participant responses
- guardrail_handling: How to handle guardrail triggers
- general_guidelines: General interview guidelines

Your Task: Output ONLY a valid JSON object with these exact fields:
- reasoning: your chain of thought / reasoning / thinking process, detailed analysis and calculations
- operations: a list of operations to be performed on the playbook
  - type: the type of operation to be performed (currently only "ADD" is supported)
  - section: the section to add the bullet to
  - content: the new content of the bullet

Available Operations:
1. ADD: Create new bullet points with fresh IDs
   - section: the section to add the new bullet to
   - content: the new content of the bullet. Note: no need to include the bullet_id in the content like '[ctx-00263] helpful=1 harmful=0 ::', the bullet_id will be added by the system.`;

    const trainingContext = tokenBudget
      ? `Training Context:
- Total token budget: ${tokenBudget} tokens
- Training progress: Sample ${currentStep || 0} out of ${totalSamples || 0}

`
      : '';

    const userPrompt = `${trainingContext}Current Playbook Stats:
${JSON.stringify(playbookStats, null, 2)}

## Recent Reflection:

${JSON.stringify(reflection, null, 2)}

## Current Playbook:

${playbookText}

## Question Context:

${questionContext || 'not provided'}

Your Task: Output ONLY a valid JSON object with these exact fields:
- reasoning: your chain of thought / reasoning / thinking process, detailed analysis and calculations
- operations: a list of operations to be performed on the playbook`;

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

    const parsed = JSON.parse(content) as {
      reasoning: string;
      operations: PlaybookOperation[];
    };

    // Validate operations
    if (!Array.isArray(parsed.operations)) {
      parsed.operations = [];
    }

    // Apply operations to playbook
    const updatedPlaybook = applyPlaybookOperations(currentPlaybook, parsed.operations);
    updatedPlaybook.metadata.lastUpdatedBy = 'curator';

    // Persist updated playbook
    const updatedPlaybookId = await upsertPlaybook(updatedPlaybook, researchGoalWeaviateId);

    return NextResponse.json({
      success: true,
      reasoning: parsed.reasoning,
      operations: parsed.operations,
      operationsCount: parsed.operations.length,
      playbookId: updatedPlaybookId,
      playbookVersion: updatedPlaybook.version,
      totalBullets: updatedPlaybook.metadata.totalBullets
    });
  } catch (error) {
    console.error('[CURATOR] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to curate playbook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

