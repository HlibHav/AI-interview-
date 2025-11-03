import { v5 as uuidv5 } from 'uuid';
import {
  createObjectWithReferences,
  ensureSchemaClass
} from '@/lib/weaviate/weaviate-helpers';
import { upsertResearchGoal } from '@/lib/weaviate/weaviate-research-goal';
import { canonicalizeGoalId } from '@/lib/weaviate/weaviate-utils';

export type QuestionPlanInput = {
  researchGoal: string;
  introduction?: string;
  questions?: string[];
  followUps?: string | Record<string, unknown>;
  createdAt?: string;
};

export async function createQuestionPlan(input: QuestionPlanInput) {
  const researchGoal = typeof input.researchGoal === 'string' ? input.researchGoal.trim() : '';
  if (!researchGoal) {
    throw new Error('researchGoal is required to create QuestionPlan');
  }

  const researchGoalId = await upsertResearchGoal({
    goalText: researchGoal,
    createdAt: input.createdAt
  });

  await ensureSchemaClass('QuestionPlan');

  const payload: Record<string, any> = {
    researchGoalId: researchGoal,
    introduction: input.introduction ?? '',
    questions: Array.isArray(input.questions) ? input.questions : [],
    followUps: typeof input.followUps === 'string' ? input.followUps : JSON.stringify(input.followUps ?? {}),
    createdAt: input.createdAt ?? new Date().toISOString()
  };

  const canonical = canonicalizeGoalId(researchGoal);
  const deterministicId = uuidv5(`plan:${canonical}:${payload.createdAt}`, uuidv5.URL);

  await createObjectWithReferences(
    'QuestionPlan',
    payload,
    researchGoalId ? { researchGoal: researchGoalId } : undefined,
    { id: deterministicId }
  );
}
