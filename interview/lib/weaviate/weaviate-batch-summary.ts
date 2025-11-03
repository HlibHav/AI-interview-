import { v5 as uuidv5 } from 'uuid';
import {
  createObjectWithReferences,
  ensureSchemaClass,
  ensureSchemaProperty,
  getWeaviateClient,
  updateObjectWithReferences
} from './weaviate-helpers';
import { canonicalizeGoalId } from './weaviate-utils';
import { ReferenceValue } from './weaviate-reference-utils';

export type KeyTheme = { theme: string; count: number };

export type PersonalityTrait = {
  name: string;
  score: number;
  descriptor?: string;
};

export type PersonalityProfile = {
  summary: string;
  traits: PersonalityTrait[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  method?: 'llm' | 'heuristic';
  generatedAt?: string;
};

export type BatchSummaryRecord = {
  id: string;
  researchGoalId: string;
  interviewIds: string[];
  keyThemes: KeyTheme[];
  summary: string;
  overallProfile: string;
  insights: string[];
  pains: string[];
  gains: string[];
  jobs: string[];
  participantCount?: number;
  createdAt?: string;
  updatedAt?: string;
  researchGoalObjectId?: string;
  sessionObjectIds?: string[];
  personalityProfile?: PersonalityProfile;
};

const BATCH_SUMMARY_CLASS = 'BatchSummary';
const PERSONALITY_PROPERTY = { name: 'personalityProfileJson', dataType: ['text'] };

function buildBatchSummaryFields(includePersonality: boolean): string {
  return `
        researchGoalId
        interviewIds
        keyThemesJson
        summary
        overallProfile
        insights
        pains
        gains
        jobs
        ${includePersonality ? 'personalityProfileJson' : ''}
        participantCount
        createdAt
        updatedAt
        _additional { id }
      `;
}

function isMissingPersonalityFieldError(error: unknown): boolean {
  const message =
    typeof (error as any)?.message === 'string'
      ? (error as any).message
      : (error as any)?.response?.errors?.[0]?.message;
  return typeof message === 'string' && message.includes('personalityProfileJson');
}

export async function ensureBatchSummaryPersonalityProperty() {
  try {
    await ensureSchemaClass(BATCH_SUMMARY_CLASS);
  } catch {
    // ignore errors from ensureClass; follow-up ensureSchemaProperty will no-op if class missing
  }
  try {
    await ensureSchemaProperty(BATCH_SUMMARY_CLASS, PERSONALITY_PROPERTY);
  } catch (error) {
    console.warn('[WEAVIATE] Failed to ensure BatchSummary.personalityProfileJson property', error);
  }
}

export type BatchSummaryListItem = BatchSummaryRecord & {
  hasSummary: boolean;
  targetAudience?: string;
};

type BatchSummaryTombstone = {
  id: string;
  researchGoalCanonical: string;
  researchGoalLabel?: string;
  deletedAt?: string;
  lastSessionUpdatedAt?: string;
};

const BATCH_SUMMARY_TOMBSTONE_CLASS = 'BatchSummaryTombstone';

type CachedTombstone = {
  tombstone: BatchSummaryTombstone;
  expiresAt: number;
};

const localTombstoneCache = new Map<string, CachedTombstone>();
const LOCAL_TOMBSTONE_TTL_MS = 5 * 60 * 1000;

async function ensureTombstoneClass() {
  try {
    await ensureSchemaClass(BATCH_SUMMARY_TOMBSTONE_CLASS);
  } catch (error) {
    console.warn('[BATCH SUMMARY] Failed to ensure tombstone class exists:', error);
  }
}

function cacheLocalTombstone(tombstone: BatchSummaryTombstone | null | undefined) {
  const canonical = canonicalizeGoalId(tombstone?.researchGoalCanonical);
  if (!canonical || !tombstone) {
    return;
  }
  localTombstoneCache.set(canonical, {
    tombstone: { ...tombstone, researchGoalCanonical: canonical },
    expiresAt: Date.now() + LOCAL_TOMBSTONE_TTL_MS,
  });
}

function purgeExpiredLocalTombstones() {
  const now = Date.now();
  for (const [key, entry] of localTombstoneCache.entries()) {
    if (entry.expiresAt <= now) {
      localTombstoneCache.delete(key);
    }
  }
}

export async function recordBatchSummaryDeletion(params: {
  canonicalGoalId: string;
  goalLabel?: string;
  lastSessionUpdatedAt?: string;
}) {
  const canonical = canonicalizeGoalId(params.canonicalGoalId);
  if (!canonical) {
    console.warn('[BATCH SUMMARY] recordBatchSummaryDeletion: canonical goal missing', params);
    return;
  }

  await ensureTombstoneClass();

  const client = getWeaviateClient();
  const nowIso = new Date().toISOString();
  const payload: Record<string, any> = {
    researchGoalCanonical: canonical,
    researchGoalLabel: params.goalLabel ?? canonical,
    deletedAt: nowIso,
  };
  if (typeof params.lastSessionUpdatedAt === 'string' && params.lastSessionUpdatedAt.trim().length > 0) {
    payload.lastSessionUpdatedAt = params.lastSessionUpdatedAt.trim();
  }

  const result = await client.graphql
    .get()
    .withClassName(BATCH_SUMMARY_TOMBSTONE_CLASS)
    .withFields('_additional { id }')
    .withWhere({
      path: ['researchGoalCanonical'],
      operator: 'Equal',
      valueText: canonical,
    })
    .withLimit(1)
    .do();
  console.log('[BATCH SUMMARY] Tombstone lookup', {
    canonicalGoalId: canonical,
    result: result?.data?.Get?.[BATCH_SUMMARY_TOMBSTONE_CLASS] ?? null
  });

  const existingId: string | undefined = result?.data?.Get?.[BATCH_SUMMARY_TOMBSTONE_CLASS]?.[0]?._additional?.id;
  const tombstoneId = uuidv5(`batch-tombstone:${canonical}`, uuidv5.URL);

  if (existingId) {
    await client.data
      .updater()
      .withClassName(BATCH_SUMMARY_TOMBSTONE_CLASS)
      .withId(existingId)
      .withProperties(payload)
      .do();
    console.log('[BATCH SUMMARY] Tombstone updated', {
      canonicalGoalId: canonical,
      tombstoneId: existingId,
      payload
    });
    try {
      const verify = await getBatchSummaryTombstone(canonical);
      console.log('[BATCH SUMMARY] Tombstone verify after update', { canonicalGoalId: canonical, verify });
      cacheLocalTombstone(verify);
    } catch (verifyError) {
      console.warn('[BATCH SUMMARY] Tombstone verify after update failed', verifyError);
    }
    return;
  }

  await client.data
    .creator()
    .withClassName(BATCH_SUMMARY_TOMBSTONE_CLASS)
    .withId(tombstoneId)
    .withProperties(payload)
    .do();
  console.log('[BATCH SUMMARY] Tombstone created', {
    canonicalGoalId: canonical,
    tombstoneId,
    payload
  });
  try {
    const verify = await getBatchSummaryTombstone(canonical);
    console.log('[BATCH SUMMARY] Tombstone verify after create', { canonicalGoalId: canonical, verify });
    cacheLocalTombstone(verify);
  } catch (verifyError) {
    console.warn('[BATCH SUMMARY] Tombstone verify after create failed', verifyError);
  }
}

export async function getBatchSummaryTombstone(canonicalGoalId: string): Promise<BatchSummaryTombstone | null> {
  const canonical = canonicalizeGoalId(canonicalGoalId);
  if (!canonical) {
    return null;
  }

  await ensureTombstoneClass();

  try {
    const client = getWeaviateClient();
    const result = await client.graphql
      .get()
      .withClassName(BATCH_SUMMARY_TOMBSTONE_CLASS)
      .withFields(`
        researchGoalCanonical
        researchGoalLabel
        deletedAt
        lastSessionUpdatedAt
        _additional { id }
      `)
      .withWhere({
        path: ['researchGoalCanonical'],
        operator: 'Equal',
        valueText: canonical,
      })
      .withLimit(1)
      .do();

    const row: any = result?.data?.Get?.[BATCH_SUMMARY_TOMBSTONE_CLASS]?.[0];
    if (!row) {
      console.log('[BATCH SUMMARY] No tombstone found', { canonicalGoalId: canonical });
      return null;
    }

    console.log('[BATCH SUMMARY] Tombstone fetched', {
      canonicalGoalId: canonical,
      tombstoneId: row?._additional?.id,
      deletedAt: row?.deletedAt,
      lastSessionUpdatedAt: row?.lastSessionUpdatedAt
    });

    return {
      id: row?._additional?.id || '',
      researchGoalCanonical: row?.researchGoalCanonical || canonical,
      researchGoalLabel: row?.researchGoalLabel || undefined,
      deletedAt: row?.deletedAt || undefined,
      lastSessionUpdatedAt: row?.lastSessionUpdatedAt || undefined,
    };
  } catch (error) {
    console.warn('[BATCH SUMMARY] Failed to load tombstone:', error);
    return null;
  }
}

export async function clearBatchSummaryTombstone(canonicalGoalId: string) {
  const canonical = canonicalizeGoalId(canonicalGoalId);
  if (!canonical) {
    return;
  }

  await ensureTombstoneClass();

  try {
    const client = getWeaviateClient();
    const result = await client.graphql
      .get()
      .withClassName(BATCH_SUMMARY_TOMBSTONE_CLASS)
      .withFields('_additional { id }')
      .withWhere({
        path: ['researchGoalCanonical'],
        operator: 'Equal',
        valueText: canonical,
      })
      .withLimit(1)
      .do();

    const existingId: string | undefined = result?.data?.Get?.[BATCH_SUMMARY_TOMBSTONE_CLASS]?.[0]?._additional?.id;
    if (!existingId) {
      return;
    }

    await client.data
      .deleter()
      .withClassName(BATCH_SUMMARY_TOMBSTONE_CLASS)
      .withId(existingId)
      .do();
    console.log('[BATCH SUMMARY] Tombstone cleared', {
      canonicalGoalId: canonical,
      tombstoneId: existingId
    });
    localTombstoneCache.delete(canonical);
  } catch (error) {
    console.warn('[BATCH SUMMARY] Failed to clear tombstone:', error);
  }
}

export async function listBatchSummaryTombstones(limit = 500): Promise<BatchSummaryTombstone[]> {
  await ensureTombstoneClass();

  if (limit <= 0) {
    return [];
  }

  try {
    const client = getWeaviateClient();
    const tombstoneByCanonical = new Map<string, BatchSummaryTombstone>();
    const pageSize = Math.min(Math.max(limit, 50), 200);
    let offset = 0;

    for (;;) {
      const remaining = limit - tombstoneByCanonical.size;
      if (remaining <= 0) {
        break;
      }

      const pageLimit = Math.min(pageSize, remaining);
      const response = await client.graphql
        .get()
        .withClassName(BATCH_SUMMARY_TOMBSTONE_CLASS)
        .withFields(`
          researchGoalCanonical
          researchGoalLabel
          deletedAt
          lastSessionUpdatedAt
          _additional { id }
        `)
        .withLimit(pageLimit)
        .withOffset(offset)
        .do();

      const rows: any[] = response?.data?.Get?.[BATCH_SUMMARY_TOMBSTONE_CLASS] || [];
      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        const canonical = canonicalizeGoalId(
          typeof row?.researchGoalCanonical === 'string'
            ? row.researchGoalCanonical
            : ''
        );
        if (!canonical) {
          continue;
        }

        const tombstone: BatchSummaryTombstone = {
          id:
            typeof row?._additional?.id === 'string' && row._additional.id.trim().length > 0
              ? row._additional.id.trim()
              : '',
          researchGoalCanonical: canonical,
          researchGoalLabel:
            typeof row?.researchGoalLabel === 'string' && row.researchGoalLabel.trim().length > 0
              ? row.researchGoalLabel.trim()
              : undefined,
          deletedAt:
            typeof row?.deletedAt === 'string' && row.deletedAt.trim().length > 0
              ? row.deletedAt.trim()
              : undefined,
          lastSessionUpdatedAt:
            typeof row?.lastSessionUpdatedAt === 'string' && row.lastSessionUpdatedAt.trim().length > 0
              ? row.lastSessionUpdatedAt.trim()
              : undefined,
        };

        if (!tombstoneByCanonical.has(canonical)) {
          tombstoneByCanonical.set(canonical, tombstone);
        } else {
          const existing = tombstoneByCanonical.get(canonical)!;
          const existingTs = toTimestamp(existing.deletedAt);
          const nextTs = toTimestamp(tombstone.deletedAt);
          if (nextTs >= existingTs) {
            tombstoneByCanonical.set(canonical, tombstone);
          }
        }
      }

      if (rows.length < pageLimit || tombstoneByCanonical.size >= limit) {
        break;
      }

      offset += rows.length;
    }

    purgeExpiredLocalTombstones();
    for (const [canonical, entry] of localTombstoneCache.entries()) {
      const cached = entry.tombstone;
      const existing = tombstoneByCanonical.get(canonical);
      if (!existing || toTimestamp(cached.deletedAt) >= toTimestamp(existing.deletedAt)) {
        tombstoneByCanonical.set(canonical, cached);
      }
    }

    const results = Array.from(tombstoneByCanonical.values());
    results.sort((a, b) => toTimestamp(b.deletedAt) - toTimestamp(a.deletedAt));

    console.log('[BATCH SUMMARY] Tombstones fetched', {
      count: results.length,
      sample: results.slice(0, 20).map((item) => ({
        canonical: item.researchGoalCanonical,
        label: item.researchGoalLabel,
        deletedAt: item.deletedAt,
        id: item.id
      }))
    });

    return results.slice(0, limit);
  } catch (error) {
    console.warn('[BATCH SUMMARY] Failed to list tombstones:', error);
    return [];
  }
}

function toKeyThemesJson(keyThemes: KeyTheme[]): string {
  try {
    return JSON.stringify(keyThemes || []);
  } catch {
    return '[]';
  }
}

function parseKeyThemesJson(json: any): KeyTheme[] {
  if (typeof json !== 'string') return [];
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr as KeyTheme[];
    return [];
  } catch {
    return [];
  }
}

function toPersonalityProfileJson(profile?: PersonalityProfile): string | undefined {
  if (!profile) return undefined;
  try {
    return JSON.stringify(profile);
  } catch {
    return undefined;
  }
}

function parsePersonalityProfileJson(value: unknown): PersonalityProfile | undefined {
  if (!value) return undefined;
  let payload: any = value;
  if (typeof value === 'string') {
    try {
      payload = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }
  const summary = typeof payload.summary === 'string' ? payload.summary : '';
  const sentiment =
    payload.sentiment === 'positive' || payload.sentiment === 'neutral' || payload.sentiment === 'negative'
      ? payload.sentiment
      : undefined;
  const method =
    payload.method === 'llm' || payload.method === 'heuristic'
      ? payload.method
      : undefined;
  const generatedAt = typeof payload.generatedAt === 'string' ? payload.generatedAt : undefined;

  const traits: PersonalityTrait[] = Array.isArray(payload.traits)
    ? payload.traits
        .map((item: any): PersonalityTrait | undefined => {
          const name = typeof item?.name === 'string' ? item.name : undefined;
          const score =
            typeof item?.score === 'number' && Number.isFinite(item.score)
              ? item.score
              : undefined;
          if (!name || score === undefined) {
            return undefined;
          }
          const descriptor = typeof item?.descriptor === 'string' ? item.descriptor : undefined;
          return { name, score, descriptor };
        })
        .filter((item: PersonalityTrait | undefined): item is PersonalityTrait => Boolean(item))
    : [];

  if (traits.length === 0 && !summary) {
    return undefined;
  }

  return {
    summary,
    traits,
    sentiment,
    method,
    generatedAt,
  };
}

export async function upsertBatchSummary(data: BatchSummaryRecord): Promise<string> {
  const client = getWeaviateClient();

  // Ensure class exists
  try {
    await ensureBatchSummaryPersonalityProperty();
  } catch (e) {
    // Non-fatal if already exists
  }

  const nowIso = new Date().toISOString();
  const naturalId = uuidv5(`batch:${data.researchGoalId}`, uuidv5.URL);

  const payload: Record<string, any> = {
    researchGoalId: data.researchGoalId,
    interviewIds: data.interviewIds || [],
    keyThemesJson: toKeyThemesJson(data.keyThemes || []),
    summary: data.summary || '',
    overallProfile: data.overallProfile || '',
    insights: data.insights || [],
    pains: data.pains || [],
    gains: data.gains || [],
    jobs: data.jobs || [],
    participantCount: data.participantCount ?? (data.interviewIds?.length || 0),
    createdAt: data.createdAt || nowIso,
    updatedAt: nowIso
  };
  const profileJson = toPersonalityProfileJson(data.personalityProfile);
  if (profileJson) {
    payload.personalityProfileJson = profileJson;
  }

  const references: Record<string, ReferenceValue> | undefined = (() => {
    const ref: Record<string, ReferenceValue> = {};
    if (data.researchGoalObjectId) {
      ref.researchGoal = data.researchGoalObjectId;
    }
    const sessionRefs = Array.from(new Set((data.sessionObjectIds ?? []).filter((id) => typeof id === 'string' && id.trim().length > 0)));
    if (sessionRefs.length > 0) {
      ref.sessions = sessionRefs;
    }
    return Object.keys(ref).length > 0 ? ref : undefined;
  })();

  // Try to find existing by researchGoalId
  const existing = await client.graphql
    .get()
    .withClassName('BatchSummary')
    .withFields('_additional { id } researchGoalId')
    .withWhere({ path: ['researchGoalId'], operator: 'Equal', valueText: data.researchGoalId })
    .withLimit(1)
    .do();

  const existingId: string | undefined = existing?.data?.Get?.BatchSummary?.[0]?._additional?.id;

  if (existingId) {
    await updateObjectWithReferences('BatchSummary', existingId, payload, references);
    return existingId;
  }

  const created = await createObjectWithReferences('BatchSummary', payload, references, { id: naturalId });
  return created.id as string;
}

export async function fetchBatchSummary(researchGoalId: string) {
  try {
    const client = getWeaviateClient();
    
    // Ensure class exists first
    try {
      await ensureBatchSummaryPersonalityProperty();
    } catch (e) {
      // Class doesn't exist yet
      return null;
    }

    const result = await client.graphql
      .get()
      .withClassName('BatchSummary')
      .withFields(buildBatchSummaryFields(true))
      .withWhere({ path: ['researchGoalId'], operator: 'Equal', valueText: researchGoalId })
      .withLimit(1)
      .do();

    const raw = result?.data?.Get?.BatchSummary?.[0];
    if (!raw) return null;

    return {
      id: raw?._additional?.id || '',
      researchGoalId: raw.researchGoalId || researchGoalId,
      interviewIds: raw.interviewIds || [],
      keyThemes: parseKeyThemesJson(raw.keyThemesJson),
      summary: raw.summary || '',
      overallProfile: raw.overallProfile || '',
      insights: raw.insights || [],
      pains: raw.pains || [],
      gains: raw.gains || [],
      jobs: raw.jobs || [],
      participantCount: raw.participantCount || (raw.interviewIds?.length || 0),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      personalityProfile: parsePersonalityProfileJson(raw.personalityProfileJson),
    } as BatchSummaryRecord;
  } catch (error) {
    if (isMissingPersonalityFieldError(error)) {
      console.warn('[BATCH SUMMARY] personalityProfileJson field missing during fetch; retrying without it');
      const client = getWeaviateClient();
      const result = await client.graphql
        .get()
        .withClassName('BatchSummary')
        .withFields(buildBatchSummaryFields(false))
        .withWhere({ path: ['researchGoalId'], operator: 'Equal', valueText: researchGoalId })
        .withLimit(1)
        .do();

      const raw = result?.data?.Get?.BatchSummary?.[0];
      if (!raw) return null;

      return {
        id: raw?._additional?.id || '',
        researchGoalId: raw.researchGoalId || researchGoalId,
        interviewIds: raw.interviewIds || [],
        keyThemes: parseKeyThemesJson(raw.keyThemesJson),
        summary: raw.summary || '',
        overallProfile: raw.overallProfile || '',
        insights: raw.insights || [],
        pains: raw.pains || [],
        gains: raw.gains || [],
        jobs: raw.jobs || [],
        participantCount: raw.participantCount || (raw.interviewIds?.length || 0),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        personalityProfile: undefined,
      } as BatchSummaryRecord;
    }
    console.error('[BATCH SUMMARY] Error fetching batch summary:', error);
    return null;
  }
}

export async function listBatchSummaries(limit = 50) {
  try {
    const client = getWeaviateClient();
    
    // Ensure class exists first
    try {
      await ensureBatchSummaryPersonalityProperty();
    } catch (e) {
      // Class might not exist yet, that's okay - return empty list
      console.log('[BATCH SUMMARY] BatchSummary class does not exist yet, returning empty list');
      return [];
    }

    const runQuery = async (includePersonality: boolean) =>
      client.graphql
        .get()
        .withClassName('BatchSummary')
        .withFields(buildBatchSummaryFields(includePersonality))
        .withLimit(limit)
        .withSort([{ path: ['updatedAt'], order: 'desc' }])
        .do();

    let queryResult: any;
    let includePersonality = true;
    try {
      queryResult = await runQuery(true);
    } catch (error) {
      if (!isMissingPersonalityFieldError(error)) {
        throw error;
      }
      includePersonality = false;
      console.warn('[BATCH SUMMARY] personalityProfileJson field missing during list; retrying without it');
      await ensureBatchSummaryPersonalityProperty();
      queryResult = await runQuery(false);
    }

    const rows: any[] = queryResult?.data?.Get?.BatchSummary || [];
    return rows.map((raw) => ({
      id: raw?._additional?.id || '',
      researchGoalId: raw?.researchGoalId || '',
      interviewIds: raw?.interviewIds || [],
      keyThemes: parseKeyThemesJson(raw?.keyThemesJson),
      summary: raw?.summary || '',
      overallProfile: raw?.overallProfile || '',
      insights: raw?.insights || [],
      pains: raw?.pains || [],
      gains: raw?.gains || [],
      jobs: raw?.jobs || [],
      participantCount: raw?.participantCount || (raw?.interviewIds?.length || 0),
      createdAt: raw?.createdAt || undefined,
      updatedAt: raw?.updatedAt || undefined,
      personalityProfile: includePersonality
        ? parsePersonalityProfileJson(raw?.personalityProfileJson)
        : undefined,
    }));
  } catch (error) {
    console.error('[BATCH SUMMARY] Error listing batches:', error);
    // Return empty array instead of throwing
    return [];
  }
}

export type ResearchGoalStats = {
  researchGoalId: string;
  interviewIds: string[];
  participantCount: number;
  createdAt?: string;
  updatedAt?: string;
  targetAudience?: string;
  sessionObjectIds?: string[];
};

export type ResearchGoalDocument = {
  id: string;
  goalText: string;
  targetAudience?: string;
  createdAt?: string;
  updatedAt?: string;
};

function toTimestamp(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function listResearchGoalStats(limit = 500): Promise<ResearchGoalStats[]> {
  try {
    const client = getWeaviateClient();
    const pageSize = 100;
    let offset = 0;
    const goals = new Map<string, {
      ids: Set<string>;
      objectIds: Set<string>;
      researchGoalId: string;
      createdAt?: string;
      updatedAt?: string;
      completedUpdatedAt?: string;
      targetAudience?: string;
    }>();

    for (;;) {
      const res = await client.graphql
        .get()
        .withClassName('InterviewSession')
        .withFields(`
          sessionId
          researchGoal
          targetAudience
          createdAt
          updatedAt
          status
          _additional { id }
        `)
        .withLimit(pageSize)
        .withOffset(offset)
        .do();

      const rows: any[] = res?.data?.Get?.InterviewSession || [];
      if (rows.length === 0) break;

      for (const raw of rows) {
        const goalText =
          typeof raw?.researchGoal === 'string' && raw.researchGoal.trim().length > 0
            ? raw.researchGoal.trim()
            : '';
        const canonical = canonicalizeGoalId(goalText);
        if (!canonical) continue;

        const sessionId =
          typeof raw?.sessionId === 'string' && raw.sessionId.trim().length > 0
            ? raw.sessionId.trim()
            : typeof raw?._additional?.id === 'string'
              ? raw._additional.id
              : '';

        const objectId =
          typeof raw?._additional?.id === 'string' && raw._additional.id.trim().length > 0
            ? raw._additional.id.trim()
            : '';

        const createdAt =
          typeof raw?.createdAt === 'string' && raw.createdAt.trim().length > 0
            ? raw.createdAt.trim()
            : undefined;

        const updatedAt =
          typeof raw?.updatedAt === 'string' && raw.updatedAt.trim().length > 0
            ? raw.updatedAt.trim()
            : createdAt;

        const statusRaw =
          typeof raw?.status === 'string' && raw.status.trim().length > 0
            ? raw.status.trim().toLowerCase()
            : '';
        const excludedStatuses = ['draft', 'pending', 'in-progress', 'scheduled', 'new', 'created', 'started'];
        const isCompleted = !(statusRaw && excludedStatuses.includes(statusRaw));

        const targetAudience =
          typeof raw?.targetAudience === 'string' && raw.targetAudience.trim().length > 0
            ? raw.targetAudience.trim()
            : undefined;

        const existing = goals.get(canonical) ?? {
          ids: new Set<string>(),
          objectIds: new Set<string>(),
          researchGoalId: goalText,
          createdAt,
          updatedAt: undefined,
          completedUpdatedAt: undefined,
          targetAudience,
        };

        if (!existing.researchGoalId && goalText) {
          existing.researchGoalId = goalText;
        }

        if (!existing.targetAudience && targetAudience) {
          existing.targetAudience = targetAudience;
        }

        if (sessionId && isCompleted) {
          existing.ids.add(sessionId);
        }

        if (objectId && isCompleted) {
          existing.objectIds.add(objectId);
        }

        if (createdAt) {
          if (!existing.createdAt || createdAt < existing.createdAt) {
            existing.createdAt = createdAt;
          }
        }

        if (updatedAt) {
          if (!existing.updatedAt || updatedAt > existing.updatedAt) {
            existing.updatedAt = updatedAt;
          }
          if (isCompleted) {
            if (!existing.completedUpdatedAt || updatedAt > existing.completedUpdatedAt) {
              existing.completedUpdatedAt = updatedAt;
            }
          }
        }

        goals.set(canonical, existing);
      }

      offset += rows.length;
      if (rows.length < pageSize || goals.size >= limit) {
        break;
      }
    }

    return Array.from(goals.values()).map((data) => ({
      researchGoalId: data.researchGoalId,
      interviewIds: Array.from(data.ids),
      sessionObjectIds: Array.from(data.objectIds),
      participantCount: data.ids.size,
      createdAt: data.createdAt,
      updatedAt: data.completedUpdatedAt || data.updatedAt,
      targetAudience: data.targetAudience,
    }));
  } catch (error) {
    console.error('[BATCH SUMMARY] Error listing research goals:', error);
    return [];
  }
}

export async function listResearchGoalDocuments(limit = 500): Promise<ResearchGoalDocument[]> {
  try {
    await ensureSchemaClass('ResearchGoal');
  } catch (error) {
    console.warn('[BATCH SUMMARY] ResearchGoal class missing, returning empty list');
    return [];
  }

  try {
    const client = getWeaviateClient();
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
      .withLimit(limit)
      .do();

    const rows: any[] = result?.data?.Get?.ResearchGoal || [];
    return rows
      .map((raw) => ({
        id: raw?._additional?.id || '',
        goalText: typeof raw?.goalText === 'string' ? raw.goalText : '',
        targetAudience:
          typeof raw?.targetAudience === 'string' ? raw.targetAudience : undefined,
        createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : undefined,
        updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : undefined,
      }))
      .filter((item) => item.goalText && item.goalText.trim().length > 0);
  } catch (error) {
    console.error('[BATCH SUMMARY] Error listing research goals:', error);
    return [];
  }
}

export async function listBatchSummariesWithFallback(limit = 200): Promise<BatchSummaryListItem[]> {
  const fetchLimit = Math.max(limit, 1000);
  const [summaries, goalStats, goalDocuments, tombstones] = await Promise.all([
    listBatchSummaries(fetchLimit),
    listResearchGoalStats(fetchLimit * 2),
    listResearchGoalDocuments(fetchLimit * 2),
    listBatchSummaryTombstones(fetchLimit * 2),
  ]);

  const tombstoneMap = new Map<string, BatchSummaryTombstone>();
  tombstones.forEach((stone) => {
    const key = canonicalizeGoalId(stone.researchGoalCanonical);
    if (key) {
      tombstoneMap.set(key, stone);
    }
  });

  const isBlockedByTombstone = (canonical: string, updatedAt?: string) => {
    const tombstone = tombstoneMap.get(canonical);
    if (!tombstone) {
      return false;
    }
    const deletedAtTs = toTimestamp(tombstone.deletedAt);
    if (deletedAtTs === 0) {
      console.log('[BATCH SUMMARY] Fallback entry blocked by tombstone with no deletedAt', {
        canonicalGoalId: canonical,
        tombstone
      });
      return true;
    }
    const itemUpdatedTs = toTimestamp(updatedAt);
    if (itemUpdatedTs === 0) {
      console.log('[BATCH SUMMARY] Fallback entry blocked (no updatedAt newer than tombstone)', {
        canonicalGoalId: canonical,
        deletedAt: tombstone.deletedAt,
        itemUpdatedAt: updatedAt
      });
      return true;
    }
    return itemUpdatedTs <= deletedAtTs;
  };

  const map = new Map<string, BatchSummaryListItem>();
  const canonicalToLabel = new Map<string, string>();

  summaries.forEach((summary) => {
    const key = canonicalizeGoalId(summary.researchGoalId);
    if (!key) return;
    canonicalToLabel.set(key, summary.researchGoalId);
    if (isBlockedByTombstone(key, summary.updatedAt)) {
      console.log('[BATCH SUMMARY] Skipping summary due to tombstone', {
        researchGoalId: summary.researchGoalId,
        canonicalGoalId: key,
        summaryUpdatedAt: summary.updatedAt,
        tombstone: tombstoneMap.get(key)
      });
      return;
    }
    map.set(key, { ...summary, hasSummary: true });
  });

  goalStats.forEach((stats) => {
    const key = canonicalizeGoalId(stats.researchGoalId);
    if (!key) return;
    if (stats.researchGoalId) {
      canonicalToLabel.set(key, stats.researchGoalId);
    }
    if (isBlockedByTombstone(key, stats.updatedAt)) {
      console.log('[BATCH SUMMARY] Skipping goal stats due to tombstone', {
        researchGoalId: stats.researchGoalId,
        canonicalGoalId: key,
        statsUpdatedAt: stats.updatedAt,
        tombstone: tombstoneMap.get(key)
      });
      return;
    }

    const existing = map.get(key);
    if (existing) {
      const merged: BatchSummaryListItem = {
        ...existing,
        interviewIds: existing.interviewIds?.length ? existing.interviewIds : stats.interviewIds,
        participantCount:
          typeof existing.participantCount === 'number'
            ? existing.participantCount
            : stats.participantCount,
        createdAt: existing.createdAt ?? stats.createdAt,
        updatedAt: existing.updatedAt ?? stats.updatedAt,
        targetAudience: existing.targetAudience ?? stats.targetAudience,
      };
      map.set(key, merged);
      return;
    }

    map.set(key, {
      id: `placeholder-${stats.researchGoalId}`,
      researchGoalId: stats.researchGoalId,
      interviewIds: stats.interviewIds,
      keyThemes: [],
      summary: '',
      overallProfile: '',
      insights: [],
      pains: [],
      gains: [],
      jobs: [],
      participantCount: stats.participantCount,
      createdAt: stats.createdAt,
      updatedAt: stats.updatedAt,
      hasSummary: false,
      targetAudience: stats.targetAudience,
    });
  });

  goalDocuments.forEach((doc) => {
    const key = canonicalizeGoalId(doc.goalText);
    if (!key) return;
    if (doc.goalText) {
      canonicalToLabel.set(key, doc.goalText);
    }
    if (isBlockedByTombstone(key, doc.updatedAt)) {
      console.log('[BATCH SUMMARY] Skipping goal document due to tombstone', {
        goalText: doc.goalText,
        canonicalGoalId: key,
        docUpdatedAt: doc.updatedAt,
        tombstone: tombstoneMap.get(key)
      });
      return;
    }

    const existing = map.get(key);
    if (existing) {
      const merged: BatchSummaryListItem = {
        ...existing,
        id:
          existing.id && !existing.id.startsWith('placeholder-')
            ? existing.id
            : doc.id || existing.id,
        createdAt: existing.createdAt ?? doc.createdAt ?? existing.createdAt,
        updatedAt: existing.updatedAt ?? doc.updatedAt ?? existing.updatedAt,
        targetAudience: existing.targetAudience ?? doc.targetAudience,
      };
      if (!merged.researchGoalId) {
        merged.researchGoalId = doc.goalText;
      }
      map.set(key, merged);
      return;
    }

    map.set(key, {
      id: doc.id || `research-goal-${key}`,
      researchGoalId: doc.goalText,
      interviewIds: [],
      keyThemes: [],
      summary: '',
      overallProfile: '',
      insights: [],
      pains: [],
      gains: [],
      jobs: [],
      participantCount: 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      hasSummary: false,
      targetAudience: doc.targetAudience,
    });
  });

  const values = Array.from(map.values()).filter((item) => {
    const canonical = canonicalizeGoalId(item.researchGoalId);
    if (canonical && isBlockedByTombstone(canonical, item.updatedAt)) {
      console.log('[BATCH SUMMARY] Removing entry during final filter due to tombstone', {
        researchGoalId: item.researchGoalId,
        canonicalGoalId: canonical,
        updatedAt: item.updatedAt,
        tombstone: tombstoneMap.get(canonical)
      });
      return false;
    }

    if (item.hasSummary) {
      return true;
    }

    const interviewCount = Array.isArray(item.interviewIds) ? item.interviewIds.length : 0;
    const participantCount =
      typeof item.participantCount === 'number' ? item.participantCount : interviewCount;

    return participantCount > 0;
  });
  values.sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt));
  console.log('[BATCH SUMMARY] Fallback list prepared', {
    total: values.length,
    tombstoneCount: tombstoneMap.size,
    researchGoals: values.map((item) => ({
      researchGoalId: item.researchGoalId,
      canonicalGoalId: canonicalizeGoalId(item.researchGoalId),
      hasSummary: item.hasSummary,
      updatedAt: item.updatedAt,
      participantCount: item.participantCount ?? item.interviewIds.length ?? 0,
      tombstone: (() => {
        const key = canonicalizeGoalId(item.researchGoalId);
        if (!key) return undefined;
        return tombstoneMap.get(key);
      })()
    }))
  });
  const filtered = values.filter((item) => {
    const canonical = canonicalizeGoalId(item.researchGoalId);
    if (!canonical) return true;
    if (!tombstoneMap.has(canonical)) return true;
    // Skip items whose label is known to be tombstoned
    return !tombstoneMap.has(canonical);
  });
  if (filtered.length !== values.length) {
    console.log('[BATCH SUMMARY] Entries removed during label check', {
      removed: values
        .filter((item) => !filtered.includes(item))
        .map((item) => ({
          researchGoalId: item.researchGoalId,
          canonicalGoalId: canonicalizeGoalId(item.researchGoalId),
          tombstone: tombstoneMap.get(canonicalizeGoalId(item.researchGoalId)),
          upstreamLabel: canonicalToLabel.get(canonicalizeGoalId(item.researchGoalId) || '')
        }))
    });
  }

  const result = filtered.slice(0, limit);
  console.log('[BATCH SUMMARY] Returning fallback list', {
    count: result.length,
    goals: result.map((item) => ({
      researchGoalId: item.researchGoalId,
      canonicalGoalId: canonicalizeGoalId(item.researchGoalId),
      hasSummary: item.hasSummary,
      participantCount: item.participantCount ?? item.interviewIds.length ?? 0
    }))
  });
  return result;
}

export type ResearchGoalSessionHandle = {
  sessionId: string;
  objectId: string;
};

export async function listSessionsForResearchGoal(
  researchGoalText: string,
  limit = 5000
): Promise<ResearchGoalSessionHandle[]> {
  const canonical = canonicalizeGoalId(researchGoalText);
  if (!canonical) {
    return [];
  }

  try {
    const client = getWeaviateClient();
    const pageSize = 100;
    let offset = 0;
    const seen = new Map<string, ResearchGoalSessionHandle>();

    for (;;) {
      const res = await client.graphql
        .get()
        .withClassName('InterviewSession')
        .withFields(`
          sessionId
          researchGoal
          _additional { id }
        `)
        .withLimit(pageSize)
        .withOffset(offset)
        .do();

      const rows: any[] = res?.data?.Get?.InterviewSession || [];
      if (rows.length === 0) {
        break;
      }

      for (const raw of rows) {
        const objectId =
          typeof raw?._additional?.id === 'string' && raw._additional.id.trim().length > 0
            ? raw._additional.id.trim()
            : '';
        if (!objectId || seen.has(objectId)) {
          continue;
        }

        const goalTextProperty =
          typeof raw?.researchGoal === 'string' && raw.researchGoal.trim().length > 0
            ? raw.researchGoal.trim()
            : '';

        const normalizedGoal = canonicalizeGoalId(goalTextProperty);
        if (!normalizedGoal || normalizedGoal !== canonical) {
          continue;
        }

        const sessionId =
          typeof raw?.sessionId === 'string' && raw.sessionId.trim().length > 0
            ? raw.sessionId.trim()
            : objectId;

        seen.set(objectId, { sessionId, objectId });
        if (seen.size >= limit) {
          break;
        }
      }

      if (rows.length < pageSize || seen.size >= limit) {
        break;
      }

      offset += rows.length;
    }

    return Array.from(seen.values());
  } catch (error) {
    console.error('[BATCH SUMMARY] Error listing sessions for research goal:', error);
    return [];
  }
}
