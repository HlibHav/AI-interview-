import { v5 as uuidv5 } from 'uuid';
import {
  getWeaviateClient,
  createObjectWithReferences,
  updateObjectWithReferences,
  ensureSchemaClass,
  ensureSchemaReference
} from '../weaviate/weaviate-helpers';
import type {
  Playbook,
  PlaybookSection,
  PlaybookBullet,
  PlaybookOperation
} from './playbook-types';

/**
 * Generate a unique bullet ID in the format "ctx-XXXXX"
 */
function generateBulletId(): string {
  const random = Math.floor(Math.random() * 100000);
  return `ctx-${String(random).padStart(5, '0')}`;
}

/**
 * Create or update a playbook in Weaviate
 */
export async function upsertPlaybook(
  playbook: Playbook,
  researchGoalWeaviateId?: string | null
): Promise<string> {
  const weaviateClient = getWeaviateClient();
  const playbookId = playbook.playbookId || uuidv5(`playbook-${playbook.researchGoalId || 'default'}`, uuidv5.URL);

  await ensureSchemaClass('InterviewPlaybook');

  if (researchGoalWeaviateId) {
    await ensureSchemaReference('InterviewPlaybook', {
      name: 'researchGoal',
      targetClass: 'ResearchGoal'
    });
  }

  const payload = {
    playbookId,
    researchGoalId: playbook.researchGoalId || '',
    version: playbook.version || 1,
    playbookContent: JSON.stringify(playbook),
    totalStrategies: playbook.metadata.totalStrategies || 0,
    totalBullets: playbook.metadata.totalBullets || 0,
    lastUpdatedBy: playbook.metadata.lastUpdatedBy || 'manual',
    createdAt: playbook.metadata.createdAt || new Date().toISOString(),
    updatedAt: playbook.metadata.updatedAt || new Date().toISOString()
  };

  const references = researchGoalWeaviateId
    ? { researchGoal: researchGoalWeaviateId }
    : undefined;

  try {
    await createObjectWithReferences(
      'InterviewPlaybook',
      payload,
      references,
      { id: playbookId }
    );
    console.log('✅ [PLAYBOOK] Created playbook', { playbookId });
    return playbookId;
  } catch (error: any) {
    const message = error?.message || '';
    if (message.includes('already exists')) {
      // Update existing playbook
      await updateObjectWithReferences(
        'InterviewPlaybook',
        playbookId,
        payload,
        references
      );
      console.log('✅ [PLAYBOOK] Updated playbook', { playbookId });
      return playbookId;
    }
    throw error;
  }
}

/**
 * Fetch a playbook by ID
 */
export async function fetchPlaybook(playbookId: string): Promise<Playbook | null> {
  const weaviateClient = getWeaviateClient();

  try {
    const result = await weaviateClient.graphql
      .get()
      .withClassName('InterviewPlaybook')
      .withFields(`
        playbookId
        researchGoalId
        version
        playbookContent
        totalStrategies
        totalBullets
        lastUpdatedBy
        createdAt
        updatedAt
      `)
      .withWhere({
        path: ['playbookId'],
        operator: 'Equal',
        valueText: playbookId
      })
      .withLimit(1)
      .do();

    const playbookRecord = result.data?.Get?.InterviewPlaybook?.[0];
    if (!playbookRecord) {
      return null;
    }

    const playbook = JSON.parse(playbookRecord.playbookContent || '{}') as Playbook;
    return playbook;
  } catch (error) {
    console.error('[PLAYBOOK] Error fetching playbook:', error);
    return null;
  }
}

/**
 * Fetch the latest playbook for a research goal
 */
export async function fetchLatestPlaybookForResearchGoal(
  researchGoalId: string
): Promise<Playbook | null> {
  const weaviateClient = getWeaviateClient();

  try {
    const result = await weaviateClient.graphql
      .get()
      .withClassName('InterviewPlaybook')
      .withFields(`
        playbookId
        researchGoalId
        version
        playbookContent
        totalStrategies
        totalBullets
        lastUpdatedBy
        createdAt
        updatedAt
      `)
      .withWhere({
        path: ['researchGoalId'],
        operator: 'Equal',
        valueText: researchGoalId
      })
      .withSort([{ path: ['version'], order: 'desc' }])
      .withLimit(1)
      .do();

    const playbookRecord = result.data?.Get?.InterviewPlaybook?.[0];
    if (!playbookRecord) {
      return null;
    }

    const playbook = JSON.parse(playbookRecord.playbookContent || '{}') as Playbook;
    return playbook;
  } catch (error) {
    console.error('[PLAYBOOK] Error fetching playbook for research goal:', error);
    return null;
  }
}

/**
 * Create an empty playbook
 */
export function createEmptyPlaybook(
  researchGoalId?: string,
  playbookId?: string
): Playbook {
  const now = new Date().toISOString();
  const id = playbookId || uuidv5(`playbook-${researchGoalId || 'default'}`, uuidv5.URL);

  return {
    playbookId: id,
    researchGoalId,
    version: 1,
    sections: [
      { sectionName: 'strategies_and_hard_rules', bullets: [] },
      { sectionName: 'effective_followup_patterns', bullets: [] },
      { sectionName: 'common_participant_responses', bullets: [] },
      { sectionName: 'red_flags_to_watch_for', bullets: [] },
      { sectionName: 'clarification_techniques', bullets: [] },
      { sectionName: 'topic_transition_strategies', bullets: [] },
      { sectionName: 'emotion_handling_guidelines', bullets: [] },
      { sectionName: 'contradiction_resolution', bullets: [] },
      { sectionName: 'guardrail_handling', bullets: [] },
      { sectionName: 'general_guidelines', bullets: [] }
    ],
    metadata: {
      totalStrategies: 0,
      totalBullets: 0,
      lastUpdatedBy: 'manual',
      createdAt: now,
      updatedAt: now
    }
  };
}

/**
 * Apply operations to a playbook (incremental ADD operations to prevent context collapse)
 */
export function applyPlaybookOperations(
  playbook: Playbook,
  operations: PlaybookOperation[]
): Playbook {
  const updated = { ...playbook };
  updated.version = playbook.version + 1;
  updated.metadata.updatedAt = new Date().toISOString();

  let totalAdded = 0;

  for (const operation of operations) {
    if (operation.type === 'ADD') {
      const section = updated.sections.find((s) => s.sectionName === operation.section);
      if (!section) {
        console.warn(`[PLAYBOOK] Section ${operation.section} not found, skipping`);
        continue;
      }

      const newBullet: PlaybookBullet = {
        bulletId: generateBulletId(),
        content: operation.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      section.bullets.push(newBullet);
      totalAdded++;
    }
  }

  // Update metadata
  updated.metadata.totalBullets = updated.sections.reduce(
    (sum, section) => sum + section.bullets.length,
    0
  );
  updated.metadata.totalStrategies = updated.sections.length;

  console.log(`[PLAYBOOK] Applied ${operations.length} operations, added ${totalAdded} bullets`);

  return updated;
}

/**
 * Format playbook for use in prompts
 */
export function formatPlaybookForPrompt(playbook: Playbook): string {
  const sections: string[] = [];

  for (const section of playbook.sections) {
    if (section.bullets.length === 0) {
      continue;
    }

    const sectionTitle = section.sectionName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const bullets = section.bullets
      .map((bullet) => {
        const tags = bullet.helpful !== undefined || bullet.harmful !== undefined
          ? ` helpful=${bullet.helpful ?? 0} harmful=${bullet.harmful ?? 0}`
          : '';
        return `[${bullet.bulletId}]${tags} :: ${bullet.content}`;
      })
      .join('\n');

    sections.push(`## ${sectionTitle}\n${bullets}`);
  }

  if (sections.length === 0) {
    return 'No playbook strategies available yet.';
  }

  return sections.join('\n\n');
}

