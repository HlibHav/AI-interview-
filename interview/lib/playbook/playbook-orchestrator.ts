/**
 * ACE Orchestrator
 * Coordinates the Generator → Reflection → Curator pipeline
 * This orchestrates the full ACE cycle after an interview session.
 */

import { fetchPlaybook, fetchLatestPlaybookForResearchGoal } from './playbook-storage';
import type { Playbook } from './playbook-types';

export type InterviewExecutionData = {
  sessionId: string;
  researchGoalId: string;
  transcript: any[];
  participantResponses: any[];
  interviewerActions: any[];
  researchGoal: string;
  sessionOutcome: 'success' | 'partial' | 'failure' | 'unknown';
  executionFeedback?: string;
  expectedOutcomes?: string;
};

/**
 * Run the full ACE cycle: Generator → Reflection → Curator
 * This is typically called after an interview session completes.
 */
export async function runACECycle(
  executionData: InterviewExecutionData
): Promise<{
  playbookId: string;
  playbookVersion: number;
  reflection: any;
  curatorOperations: number;
}> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Step 1: Get or create playbook
  let playbook = await fetchLatestPlaybookForResearchGoal(executionData.researchGoalId);
  if (!playbook) {
    // Create empty playbook if none exists - this would typically be done by the Generator
    // For now, we'll create it here
    const { createEmptyPlaybook, upsertPlaybook } = await import('./playbook-storage');
    playbook = createEmptyPlaybook(executionData.researchGoalId);
    await upsertPlaybook(playbook);
  }

  // Step 2: Reflection Phase
  const reflectionResponse = await fetch(`${baseUrl}/api/agents/reflection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playbookId: playbook.playbookId,
      interviewTranscript: executionData.transcript,
      participantResponses: executionData.participantResponses,
      interviewerActions: executionData.interviewerActions,
      researchGoal: executionData.researchGoal,
      groundTruthOrExpectedOutcome: executionData.expectedOutcomes,
      executionFeedback: executionData.executionFeedback,
      sessionOutcome: executionData.sessionOutcome
    })
  });

  if (!reflectionResponse.ok) {
    throw new Error(`Reflection phase failed: ${reflectionResponse.statusText}`);
  }

  const reflectionResult = await reflectionResponse.json();
  const reflection = reflectionResult.reflection;

  // Step 3: Curator Phase
  const curatorResponse = await fetch(`${baseUrl}/api/agents/curator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playbookId: playbook.playbookId,
      reflection,
      researchGoalId: executionData.researchGoalId,
      questionContext: executionData.researchGoal
    })
  });

  if (!curatorResponse.ok) {
    throw new Error(`Curator phase failed: ${curatorResponse.statusText}`);
  }

  const curatorResult = await curatorResponse.json();

  return {
    playbookId: curatorResult.playbookId,
    playbookVersion: curatorResult.playbookVersion,
    reflection,
    curatorOperations: curatorResult.operationsCount || 0
  };
}

/**
 * Get playbook for use in Generator phase
 */
export async function getPlaybookForGeneration(
  researchGoalId: string,
  playbookId?: string
): Promise<Playbook | null> {
  if (playbookId) {
    return await fetchPlaybook(playbookId);
  }
  return await fetchLatestPlaybookForResearchGoal(researchGoalId);
}

