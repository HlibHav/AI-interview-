import { v5 as uuidv5 } from 'uuid';
import {
  ensureSchemaClass,
  createObjectWithReferences,
  updateObjectWithReferences,
  getWeaviateClient
} from '@/lib/weaviate/weaviate-helpers';
import { canonicalizeGoalId } from '@/lib/weaviate/weaviate-utils';

export type ResearchGoalUpsertInput = {
  goalText: string;
  targetAudience?: string;
  brief?: string;
  clarifications?: string | string[];
  duration?: number;
  sensitivity?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function upsertResearchGoal(input: ResearchGoalUpsertInput): Promise<string | null> {
  const goalText = typeof input.goalText === 'string' ? input.goalText.trim() : '';
  if (!goalText) {
    return null;
  }

  await ensureSchemaClass('ResearchGoal');
  const client = getWeaviateClient();
  const canonical = canonicalizeGoalId(goalText) || goalText.toLowerCase();

  const result = await client.graphql
    .get()
    .withClassName('ResearchGoal')
    .withFields(`
      goalText
      targetAudience
      createdAt
      updatedAt
      _additional { id }
    `)
    .withWhere({
      path: ['goalText'],
      operator: 'Like',
      valueText: goalText
    })
    .withLimit(10)
    .do();

  const rows: any[] = result?.data?.Get?.ResearchGoal || [];
  const existing = rows.find((row) => canonicalizeGoalId(row?.goalText) === canonical);
  const existingId: string | undefined = existing?._additional?.id;

  const nowIso = new Date().toISOString();
  const payload: Record<string, any> = {
    goalText,
    targetAudience: input.targetAudience ?? existing?.targetAudience ?? '',
    duration: typeof input.duration === 'number' ? input.duration : undefined,
    sensitivity: typeof input.sensitivity === 'string' ? input.sensitivity : undefined,
    brief: typeof input.brief === 'string' ? input.brief : existing?.brief ?? '',
    clarifications: Array.isArray(input.clarifications)
      ? JSON.stringify(input.clarifications)
      : typeof input.clarifications === 'string'
        ? input.clarifications
        : existing?.clarifications ?? '',
    createdAt: input.createdAt ?? existing?.createdAt ?? nowIso,
    updatedAt: input.updatedAt ?? nowIso
  };

  if (existingId) {
    await updateObjectWithReferences('ResearchGoal', existingId, payload);
    return existingId;
  }

  const deterministicId = uuidv5(`goal:${canonical}`, uuidv5.URL);
  const created = await createObjectWithReferences('ResearchGoal', payload, undefined, {
    id: deterministicId
  });
  return created.id as string;
}
