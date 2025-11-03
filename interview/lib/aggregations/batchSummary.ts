import OpenAI from 'openai';
import { getWeaviateClient } from '@/lib/weaviate/weaviate-helpers';
import { upsertResearchGoal } from '@/lib/weaviate/weaviate-research-goal';
import { parseInterviewSession } from '@/lib/weaviate/weaviate-session';
import {
  upsertBatchSummary,
  BatchSummaryRecord,
  KeyTheme,
  listResearchGoalStats,
  getBatchSummaryTombstone,
  clearBatchSummaryTombstone
} from '@/lib/weaviate/weaviate-batch-summary';
import { canonicalizeGoalId } from '@/lib/weaviate/weaviate-utils';

type PerInterviewSummary = {
  sessionId: string;
  objectId?: string;
  summary?: string;
  keyThemes?: string[];
  insights?: string[];
  updatedAt?: string;
  createdAt?: string;
};

function formatThemeLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function countThemes(items: string[]): KeyTheme[] {
const map = new Map<string, { theme: string; count: number }>();

  for (const raw of items) {
    const original = typeof raw === 'string' ? raw.trim() : '';
    if (!original) continue;
    const key = original.toLowerCase();
    const entry = map.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      map.set(key, {
        theme: formatThemeLabel(original),
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

const PAIN_KEYWORDS = ['pain', 'issue', 'problem', 'struggle', 'frustr', 'challenge', 'difficult', 'block', 'concern', 'confus', 'lack', 'risk'];
const GAIN_KEYWORDS = ['benefit', 'increase', 'improve', 'help', 'value', 'opportun', 'positive', 'grow', 'support', 'enable', 'success'];
const JOB_KEYWORDS = ['need to', 'have to', 'must', 'responsible', 'task', 'job', 'process', 'workflow', 'ensure', 'manage', 'so that', 'goal', 'objective'];

function filterByKeywords(texts: string[], keywords: string[]): string[] {
  const lowerKeywords = keywords.map((word) => word.toLowerCase());
  const results: string[] = [];
  for (const text of texts) {
    const lower = text.toLowerCase();
    if (lowerKeywords.some((kw) => lower.includes(kw))) {
      results.push(text);
      if (results.length >= 3) break;
    }
  }
  return results;
}

function buildFallbackThemesFromInsights(insights: string[]): KeyTheme[] {
  if (insights.length === 0) return [];
  return Array.from(new Set(insights))
    .slice(0, 5)
    .map((sentence) => ({ theme: formatThemeLabel(sentence.replace(/\.$/, '')), count: 1 }));
}

function deriveFallbackDetails(params: {
  themeCounts: KeyTheme[];
  perInterview: PerInterviewSummary[];
  existingSummary: string;
  existingProfile: string;
  existingPains: string[];
  existingGains: string[];
  existingJobs: string[];
  existingInsights: string[];
}) {
  const summaryCandidates = params.perInterview
    .map((item) => (item.summary || '').trim())
    .filter((text) => text.length > 0);

  const insightCandidates = Array.from(
    new Set([
      ...params.existingInsights,
      ...params.perInterview.flatMap((item) => (item.insights || []).map((insight) => (insight || '').trim()))
    ])
  ).filter((text) => text.length > 0);

  const fallbackThemes = params.themeCounts.length > 0
    ? params.themeCounts
    : buildFallbackThemesFromInsights(insightCandidates.length > 0 ? insightCandidates : summaryCandidates);

  const summary = params.existingSummary
    || (summaryCandidates.length > 0
      ? summaryCandidates.slice(0, 3).join(' ')
      : fallbackThemes.length > 0
        ? `Participants discussed recurring themes such as ${fallbackThemes.slice(0, 3).map((t) => t.theme).join(', ')}.`
        : 'Participants shared their collective experiences about this research goal.');

  const overallProfile = params.existingProfile
    || (summaryCandidates.length > 0
      ? summaryCandidates[0]
      : fallbackThemes.length > 0
        ? `Participants typically focus on ${fallbackThemes[0].theme.toLowerCase()}.`
        : 'Participants provided feedback based on their recent interactions.');

  const pains = params.existingPains.length > 0
    ? params.existingPains
    : (() => {
        const fromInsights = filterByKeywords(insightCandidates, PAIN_KEYWORDS);
        if (fromInsights.length > 0) return fromInsights;
        return fallbackThemes.slice(0, 3).map((theme) => `Challenge: ${theme.theme}`);
      })();

  const gains = params.existingGains.length > 0
    ? params.existingGains
    : (() => {
        const fromInsights = filterByKeywords(insightCandidates, GAIN_KEYWORDS);
        if (fromInsights.length > 0) return fromInsights;
        return fallbackThemes.slice(0, 3).map((theme) => `Opportunity: ${theme.theme}`);
      })();

  const jobs = params.existingJobs.length > 0
    ? params.existingJobs
    : (() => {
        const fromInsights = filterByKeywords(insightCandidates, JOB_KEYWORDS);
        if (fromInsights.length > 0) return fromInsights;
        return fallbackThemes.slice(0, 3).map((theme) => `Participants aim to ${theme.theme.toLowerCase()}.`);
      })();

  const insights = params.existingInsights.length > 0
    ? params.existingInsights
    : (insightCandidates.length > 0 ? insightCandidates.slice(0, 10) : summaryCandidates.slice(0, 10));

  return {
    summary,
    overallProfile,
    pains,
    gains,
    jobs,
    keyThemes: fallbackThemes,
    insights,
  };
}
const EXCLUDED_STATUSES = ['draft', 'pending', 'in-progress', 'scheduled', 'new', 'created', 'started'];

type WhereFilter = {
  path?: string[];
  operator?: string;
  valueText?: string;
  operands?: WhereFilter[];
};

function buildSessionIdFilter(sessionIds: string[]): WhereFilter | undefined {
  const conditions = sessionIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map<WhereFilter>((id) => ({ path: ['sessionId'], operator: 'Equal', valueText: id }));

  if (conditions.length === 0) {
    return undefined;
  }

  return conditions.reduce<WhereFilter | undefined>((acc, condition) => {
    if (!acc) return condition;
    return { operator: 'Or', operands: [acc, condition] };
  }, undefined)!;
}

async function fetchInterviewSummariesByResearchGoal(
  researchGoalId: string,
  sessionIds?: string[]
): Promise<PerInterviewSummary[]> {
  try {
    const client = getWeaviateClient();
    const summaries: PerInterviewSummary[] = [];
    const seenSessions = new Set<string>();
    const seenObjectIds = new Set<string>();
    const canonicalGoal = canonicalizeGoalId(researchGoalId);

    const normalizedSessionIds = Array.from(new Set((sessionIds ?? []).map((id) => id.trim()).filter(Boolean)));

    const processRows = (rows: any[]) => {
      rows.forEach((raw) => {
        const rec = parseInterviewSession(raw);
        const objectId =
          typeof raw?._additional?.id === 'string' && raw._additional.id.trim().length > 0
            ? raw._additional.id.trim()
            : undefined;

        const sessionIdCandidate =
          typeof rec?.sessionId === 'string' && rec.sessionId.trim().length > 0
            ? rec.sessionId.trim()
            : typeof raw?.sessionId === 'string' && raw.sessionId.trim().length > 0
              ? raw.sessionId.trim()
              : undefined;

        const sessionId = sessionIdCandidate || objectId;
        if (!sessionId && !objectId) {
          return;
        }

        if ((sessionId && seenSessions.has(sessionId)) || (objectId && seenObjectIds.has(objectId))) {
          return;
        }

        const status = typeof raw?.status === 'string' ? raw.status.trim().toLowerCase() : '';
        if (status && EXCLUDED_STATUSES.includes(status)) {
          return;
        }

        const recordUpdatedAt =
          typeof rec?.updatedAt === 'string' && rec.updatedAt.trim().length > 0
            ? rec.updatedAt.trim()
            : typeof raw?.updatedAt === 'string' && raw.updatedAt.trim().length > 0
              ? raw.updatedAt.trim()
              : undefined;
        const recordCreatedAt =
          typeof rec?.createdAt === 'string' && rec.createdAt.trim().length > 0
            ? rec.createdAt.trim()
            : typeof raw?.createdAt === 'string' && raw.createdAt.trim().length > 0
              ? raw.createdAt.trim()
              : undefined;

        const rawGoalCanonical = canonicalizeGoalId(
          typeof rec?.researchGoal === 'string' && rec.researchGoal.trim().length > 0
            ? rec.researchGoal
            : typeof raw?.researchGoal === 'string'
              ? raw.researchGoal
              : ''
        );
        if (canonicalGoal) {
          const matches = rawGoalCanonical === canonicalGoal;
          if (!matches) {
            return;
          }
        }

        if (sessionId) {
          seenSessions.add(sessionId);
        }
        if (objectId) {
          seenObjectIds.add(objectId);
        }

        let keyThemes: string[] = [];
        if (Array.isArray(rec?.keyFindings) && rec.keyFindings.length > 0) {
          keyThemes = rec.keyFindings as string[];
        } else if (Array.isArray(rec?.summaries) && rec.summaries.length > 0) {
          const first = rec.summaries[0];
          if (Array.isArray(first?.keyThemes)) {
            keyThemes = first.keyThemes;
          }
        }

        const insights: string[] = Array.isArray(rec?.summaries?.[0]?.insights)
          ? (rec.summaries![0]!.insights as string[])
          : Array.isArray(rec?.insights)
            ? (rec.insights as string[])
            : [];

        summaries.push({
          sessionId,
          objectId,
          summary: rec?.summary || rec?.summaries?.[0]?.summary || '',
          keyThemes,
          insights,
          updatedAt: recordUpdatedAt,
          createdAt: recordCreatedAt
        });
      });
    };

    if (normalizedSessionIds.length > 0) {
      let fetchedAny = false;

      const chunkSize = 20;
      for (let index = 0; index < normalizedSessionIds.length; index += chunkSize) {
        const chunk = normalizedSessionIds.slice(index, index + chunkSize);
        const whereFilter = buildSessionIdFilter(chunk);
        if (!whereFilter) continue;

        const res = await client.graphql
          .get()
          .withClassName('InterviewSession')
          .withFields(`
            _additional { id }
            sessionId
            summary
            keyFindings
            insights
            researchGoal
            status
            createdAt
            updatedAt
          `)
          .withWhere(whereFilter)
          .withLimit(chunk.length)
          .do();

        const rows: any[] = res?.data?.Get?.InterviewSession || [];
        if (rows.length > 0) {
          fetchedAny = true;
        }

        processRows(rows);
      }

      if (summaries.length > 0) {
        return summaries;
      }

      if (fetchedAny) {
        // We found matching items but none produced summaries (likely filtered out
        // due to status or missing content). Fall through to broader scan so we
        // can still pick up any stray sessions linked to this research goal.
        console.warn(
          '[BATCH SUMMARY] No summaries produced from targeted sessionId lookup; falling back to goal-wide scan',
          { researchGoalId, requestedSessions: normalizedSessionIds.length }
        );
      }
    }

    const pageSize = 100;
    let offset = 0;

    for (;;) {
      const res = await client.graphql
        .get()
        .withClassName('InterviewSession')
        .withFields(`
          _additional { id }
          sessionId
          summary
          keyFindings
          insights
          researchGoal
          status
          createdAt
          updatedAt
        `)
        .withLimit(pageSize)
        .withOffset(offset)
        .do();

      const rows: any[] = res?.data?.Get?.InterviewSession || [];
      if (rows.length === 0) break;

      processRows(rows);

      offset += rows.length;
      if (rows.length < pageSize) break;
    }

    return summaries;
  } catch (error) {
    console.error('[BATCH SUMMARY] Error fetching interview summaries:', error);
    return [];
  }
}

function fallbackDerivePGJ(items: PerInterviewSummary[]) {
  // Heuristic fallback: empty arrays; real derivation done via LLM when available
  return { pains: [] as string[], gains: [] as string[], jobs: [] as string[] };
}

export async function computeAndPersistBatchSummary(
  researchGoalId: string,
  options?: { sessionIds?: string[] }
): Promise<BatchSummaryRecord | null> {
  try {
    console.log('[BATCH SUMMARY] computeAndPersistBatchSummary invoked', {
      researchGoalId,
      optionsSessionIds: options?.sessionIds?.length ?? 0
    });

    const canonicalGoal = canonicalizeGoalId(researchGoalId);
    let goalLabel = researchGoalId;
    let sessionIds = Array.from(new Set((options?.sessionIds ?? []).map((id) => id.trim()).filter(Boolean)));

    const stats = await listResearchGoalStats(1000);
    const statsMatch = stats.find((entry) => canonicalizeGoalId(entry.researchGoalId) === canonicalGoal);
    if (statsMatch) {
      if (sessionIds.length === 0) {
        sessionIds = Array.from(new Set((statsMatch.interviewIds ?? []).map((id) => id.trim()).filter(Boolean)));
      }
      if (statsMatch.researchGoalId) {
        goalLabel = statsMatch.researchGoalId;
      }
    }
    console.log('[BATCH SUMMARY] Stats lookup result', {
      researchGoalId,
      canonicalGoal,
      statsMatch: statsMatch
        ? {
            researchGoalId: statsMatch.researchGoalId,
            participantCount: statsMatch.participantCount,
            createdAt: statsMatch.createdAt,
            updatedAt: statsMatch.updatedAt
          }
        : null,
      sessionIdsFromOptions: options?.sessionIds?.length ?? 0,
      sessionIdsAfterStats: sessionIds.length
    });

    const tombstone = canonicalGoal ? await getBatchSummaryTombstone(canonicalGoal) : null;
    if (tombstone) {
      console.log('[BATCH SUMMARY] Tombstone loaded', {
        researchGoalId,
        tombstone
      });
    } else {
      console.log('[BATCH SUMMARY] No tombstone present', { researchGoalId, canonicalGoal });
    }
    if (tombstone) {
      const deletedAtMs = Date.parse(tombstone.deletedAt ?? '');
      const statsUpdatedAtMs = statsMatch?.updatedAt ? Date.parse(statsMatch.updatedAt) : Number.NaN;
      const hasFreshStats = !Number.isNaN(statsUpdatedAtMs) && !Number.isNaN(deletedAtMs) && statsUpdatedAtMs > deletedAtMs;

      if (!Number.isNaN(deletedAtMs) && !hasFreshStats) {
        console.log('[BATCH SUMMARY] Skipping recompute due to deletion tombstone', {
          researchGoalId,
          deletedAt: tombstone.deletedAt,
          lastSessionUpdatedAt: statsMatch?.updatedAt
        });
        return null;
      }
    }

    const perInterview = await fetchInterviewSummariesByResearchGoal(goalLabel, sessionIds);
    console.log('[BATCH SUMMARY] Per-interview summaries fetched', {
      researchGoalId,
      goalLabel,
      canonicalGoal,
      summaryCount: perInterview.length,
      sampleSessionIds: perInterview.slice(0, 5).map((item) => item.sessionId)
    });
    if (perInterview.length === 0) {
      console.log(`[BATCH SUMMARY] No interviews found for research goal: ${researchGoalId}`);
      return null;
    }

    if (tombstone) {
      const deletedAtMs = Date.parse(tombstone.deletedAt ?? '');
      let latestSessionUpdateMs = statsMatch?.updatedAt ? Date.parse(statsMatch.updatedAt) : Number.NaN;

      for (const item of perInterview) {
        const updated = item.updatedAt ?? item.createdAt;
        if (!updated) continue;
        const timestamp = Date.parse(updated);
        if (Number.isNaN(timestamp)) continue;
        latestSessionUpdateMs = Number.isNaN(latestSessionUpdateMs)
          ? timestamp
          : Math.max(latestSessionUpdateMs, timestamp);
      }

      if (!Number.isNaN(deletedAtMs) &&
        (Number.isNaN(latestSessionUpdateMs) || latestSessionUpdateMs <= deletedAtMs)) {
        console.log('[BATCH SUMMARY] Skipping recompute; no sessions newer than deletion timestamp', {
          researchGoalId,
          deletedAt: tombstone.deletedAt,
          latestSessionUpdate: Number.isNaN(latestSessionUpdateMs) ? null : new Date(latestSessionUpdateMs).toISOString()
        });
        return null;
      }
      console.log('[BATCH SUMMARY] Tombstone allows recompute (fresh activity detected)', {
        researchGoalId,
        deletedAt: tombstone.deletedAt,
        latestSessionUpdate: Number.isNaN(latestSessionUpdateMs) ? null : new Date(latestSessionUpdateMs).toISOString()
      });
    }

    const interviewIds = perInterview.map((p) => p.sessionId).filter(Boolean);
    const sessionObjectIds = Array.from(new Set(perInterview.map((p) => p.objectId).filter((id): id is string => typeof id === 'string' && id.length > 0)));
    console.log('[BATCH SUMMARY] Aggregation inputs prepared', {
      researchGoalId,
      interviewIdCount: interviewIds.length,
      sessionObjectIdCount: sessionObjectIds.length
    });

    const researchGoalObjectId = await upsertResearchGoal({
      goalText: goalLabel,
      targetAudience: statsMatch?.targetAudience,
      createdAt: statsMatch?.createdAt,
      updatedAt: statsMatch?.updatedAt
    });
    const allThemes = perInterview.flatMap((p) => p.keyThemes || []);
    const themeCounts = countThemes(allThemes);
    const rawInsights = perInterview.flatMap((p) => p.insights || []).map((insight) => (insight || '').trim()).filter((text) => text.length > 0);

    let summary = '';
    let overallProfile = '';
    let pains: string[] = [];
    let gains: string[] = [];
    let jobs: string[] = [];

    const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    if (openai) {
      const system = 'You aggregate multiple interview summaries into a concise batch report.';
      const prompt = `Given these per-interview summaries JSON, produce a compact JSON with fields:\n{
  "summary": string, // 120-180 words
  "overallProfile": string, // 1-2 sentences describing typical respondent
  "pains": string[],
  "gains": string[],
  "jobs": string[]
}\n\nPer-interview summaries:\n${JSON.stringify(perInterview, null, 2)}\n\nTheme popularity (lowercase):\n${JSON.stringify(themeCounts, null, 2)}`;

      try {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_SUMMARIZER_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        });
        const content = completion.choices?.[0]?.message?.content || '{}';
        const json = JSON.parse(content);
        summary = json.summary || '';
        overallProfile = json.overallProfile || '';
        pains = Array.isArray(json.pains) ? json.pains : [];
        gains = Array.isArray(json.gains) ? json.gains : [];
        jobs = Array.isArray(json.jobs) ? json.jobs : [];
      } catch (e) {
        const pgj = fallbackDerivePGJ(perInterview);
        pains = pgj.pains; gains = pgj.gains; jobs = pgj.jobs;
        summary = summary || 'Batch summary unavailable (LLM error).';
      }
    } else {
      const pgj = fallbackDerivePGJ(perInterview);
      pains = pgj.pains; gains = pgj.gains; jobs = pgj.jobs;
      summary = 'Set OPENAI_API_KEY to enable generated batch summary.';
    }

    const fallback = deriveFallbackDetails({
      themeCounts,
      perInterview,
      existingSummary: summary,
      existingProfile: overallProfile,
      existingPains: pains,
      existingGains: gains,
      existingJobs: jobs,
      existingInsights: rawInsights,
    });

    summary = fallback.summary;
    overallProfile = fallback.overallProfile;
    pains = fallback.pains;
    gains = fallback.gains;
    jobs = fallback.jobs;
    const keyThemes = fallback.keyThemes;
    const insights = Array.from(new Set(fallback.insights)).slice(0, 20);

    const record: BatchSummaryRecord = {
      id: '',
      researchGoalId: goalLabel,
      interviewIds,
      keyThemes,
      summary,
      overallProfile,
      insights,
      pains,
      gains,
      jobs,
      participantCount: interviewIds.length,
      researchGoalObjectId: researchGoalObjectId ?? undefined,
      sessionObjectIds
    };

    const id = await upsertBatchSummary(record);
    console.log('[BATCH SUMMARY] Batch upserted', {
      researchGoalId,
      weaviateId: id,
      interviewCount: interviewIds.length,
      hasTombstone: Boolean(tombstone)
    });
    if (canonicalGoal) {
      await clearBatchSummaryTombstone(canonicalGoal);
      console.log('[BATCH SUMMARY] Tombstone cleared after successful recompute', {
        researchGoalId,
        canonicalGoal
      });
    }
    return { ...record, id };
  } catch (error) {
    console.error('[BATCH SUMMARY] Error computing batch summary:', error);
    throw error; // Re-throw so API can handle it
  }
}

export type BatchSummaryBulkResult = {
  researchGoalId: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
};

export async function computeAndPersistAllBatchSummaries(limit = 500): Promise<BatchSummaryBulkResult[]> {
  const stats = await listResearchGoalStats(limit);
  const results: BatchSummaryBulkResult[] = [];

  for (const goal of stats) {
    const researchGoalId = goal.researchGoalId?.trim();
    if (!researchGoalId) {
      continue;
    }

    if (!goal.participantCount || goal.participantCount <= 0) {
      results.push({
        researchGoalId,
        success: false,
        skipped: true,
        error: 'No interviews found'
      });
      continue;
    }

    try {
      const record = await computeAndPersistBatchSummary(researchGoalId, {
        sessionIds: goal.interviewIds,
      });
      if (record) {
        results.push({
          researchGoalId,
          success: true
        });
      } else {
        results.push({
          researchGoalId,
          success: false,
          skipped: true,
          error: 'No completed interviews'
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        researchGoalId,
        success: false,
        error: message
      });
    }
  }

  return results;
}
