import { NextRequest, NextResponse } from 'next/server';
import {
  fetchBatchSummary,
  listResearchGoalStats,
  listResearchGoalDocuments,
  listSessionsForResearchGoal,
  recordBatchSummaryDeletion
} from '@/lib/weaviate/weaviate-batch-summary';
import { canonicalizeGoalId } from '@/lib/weaviate/weaviate-utils';
import { deleteObjectCascade, getWeaviateClient } from '@/lib/weaviate/weaviate-helpers';
import { deleteInterviewSessionBySessionId } from '@/lib/weaviate/weaviate-session';
import { v5 as uuidv5 } from 'uuid';

declare global {
  // Shared in-memory cache used by /api/sessions routes
  // eslint-disable-next-line no-var
  var sessionsStore: Map<string, any> | undefined;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  _req: NextRequest,
  context: { params: { researchGoalId?: string } }
) {
  try {
    console.log('[BATCH SUMMARY DELETE] Request received', {
      params: context.params
    });
    const rawParam = context.params?.researchGoalId ?? '';
    const researchGoalId = decodeURIComponent(rawParam).trim();

    if (!researchGoalId) {
      return NextResponse.json({ error: 'researchGoalId is required' }, { status: 400 });
    }

    const targetCanonical = canonicalizeGoalId(researchGoalId);
    const stats = await listResearchGoalStats(2000);
    const statsMatch = stats.find((row) => canonicalizeGoalId(row.researchGoalId) === targetCanonical);

    const interviewIds = new Set<string>();
    const objectIds = new Set<string>();
    const summary = await fetchBatchSummary(researchGoalId);
    console.log('[BATCH SUMMARY DELETE] Initial data snapshot', {
      researchGoalId,
      targetCanonical,
      hasSummary: Boolean(summary),
      statsMatch: statsMatch
        ? {
            researchGoalId: statsMatch.researchGoalId,
            participantCount: statsMatch.participantCount,
            interviewIds: statsMatch.interviewIds?.length ?? 0,
            sessionObjectIds: statsMatch.sessionObjectIds?.length ?? 0,
            updatedAt: statsMatch.updatedAt
          }
        : null
    });
    const maybeAddObjectId = (value?: string) => {
      if (typeof value === 'string' && /^[0-9a-fA-F-]{36}$/.test(value.trim())) {
        objectIds.add(value.trim());
      }
    };

    if (summary) {
      (Array.isArray(summary.interviewIds) ? summary.interviewIds : []).forEach((id) => {
        if (typeof id === 'string' && id.trim()) {
          const trimmed = id.trim();
          interviewIds.add(trimmed);
          maybeAddObjectId(trimmed);
        }
      });
    }
    (statsMatch?.interviewIds ?? []).forEach((id) => {
      if (typeof id === 'string' && id.trim()) {
        const trimmed = id.trim();
        interviewIds.add(trimmed);
        maybeAddObjectId(trimmed);
      }
    });
    const sessionHandles = await listSessionsForResearchGoal(
      statsMatch?.researchGoalId ?? researchGoalId,
      5000
    );
    console.log('[BATCH SUMMARY DELETE] sessionHandles', sessionHandles);

    sessionHandles.forEach((handle) => {
      if (handle.sessionId) {
        interviewIds.add(handle.sessionId);
        maybeAddObjectId(handle.sessionId);
      }
      if (handle.objectId) {
        objectIds.add(handle.objectId);
      }
    });

    (statsMatch?.sessionObjectIds ?? []).forEach((id) => {
      if (typeof id === 'string' && id.trim()) {
        objectIds.add(id.trim());
      }
    });

    const weaviateClient = getWeaviateClient();
    console.log('[BATCH SUMMARY DELETE] Initial interviewIds', Array.from(interviewIds));
    console.log('[BATCH SUMMARY DELETE] Initial objectIds', Array.from(objectIds));
    const failedDeletes: Array<{ className: string; id: string; error: string }> = [];
    const cleanupCounts: Record<string, number> = {};
    const sessionStore = globalThis.sessionsStore;
    const purgedSessionCacheIds = new Set<string>();

    const evictSessionCacheEntry = (sessionId?: string) => {
      if (!sessionStore) return;
      const key = typeof sessionId === 'string' ? sessionId.trim() : '';
      if (!key) return;
      if (sessionStore.delete(key)) {
        purgedSessionCacheIds.add(key);
      }
    };

    const purgeSessionCacheForGoal = () => {
      if (!sessionStore) return;
      if (!targetCanonical) return;
      for (const [cacheId, cacheValue] of sessionStore.entries()) {
        const storedGoal = canonicalizeGoalId(cacheValue?.researchGoal);
        if (storedGoal && storedGoal === targetCanonical) {
          sessionStore.delete(cacheId);
          purgedSessionCacheIds.add(cacheId);
        }
      }
    };

    const cleanupSessionArtifacts = async (sessionId?: string, objectId?: string) => {
      const trimmedSessionId = typeof sessionId === 'string' ? sessionId.trim() : '';
      const trimmedObjectId = typeof objectId === 'string' ? objectId.trim() : '';

      if (trimmedSessionId) {
        await deleteByProperty('TranscriptDocument', 'sessionId', trimmedSessionId);
        await deleteByProperty('TranscriptChunk', 'sessionId', trimmedSessionId);
        await deleteByProperty('PsychometricProfile', 'sessionId', trimmedSessionId);
        evictSessionCacheEntry(trimmedSessionId);
      }

      if (trimmedObjectId) {
        await deleteByProperty('Annotation', 'session', trimmedObjectId);
      }
    };

    const recordCleanup = (className: string, increment: number) => {
      if (increment <= 0) return;
      cleanupCounts[className] = (cleanupCounts[className] ?? 0) + increment;
    };

    const deleteIds = async (className: string, ids: Iterable<string>) => {
      let deleted = 0;
      for (const id of ids) {
        const trimmed = typeof id === 'string' ? id.trim() : '';
        if (!trimmed) continue;
        try {
          await weaviateClient.data.deleter().withClassName(className).withId(trimmed).do();
          deleted += 1;
        } catch (error: any) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          if (!message.toLowerCase().includes('not found')) {
            failedDeletes.push({ className, id: trimmed, error: message });
          }
        }
      }
      recordCleanup(className, deleted);
      return deleted;
    };

    const deleteByProperty = async (className: string, property: string, value: string) => {
      const ids = new Set<string>();
      const pageSize = 200;
      let offset = 0;

      for (;;) {
        let res: any;
        try {
          res = await weaviateClient.graphql
            .get()
            .withClassName(className)
            .withFields('_additional { id }')
            .withWhere({ path: [property], operator: 'Equal', valueText: value })
            .withLimit(pageSize)
            .withOffset(offset)
            .do();
        } catch (error) {
          console.warn('[BATCH SUMMARY DELETE] Failed to query objects for cleanup', {
            className,
            property,
            value,
            error
          });
          return 0;
        }

        const rows: any[] = res?.data?.Get?.[className] || [];
        rows.forEach((row) => {
          const id = row?._additional?.id;
          if (typeof id === 'string' && id.trim().length > 0) {
            ids.add(id.trim());
          }
        });

        if (rows.length < pageSize) {
          break;
        }
        offset += rows.length;
      }

      if (ids.size === 0) {
        return 0;
      }

      return deleteIds(className, ids);
    };

    const sessionIdList = Array.from(interviewIds);
    const sessionObjectIdList = Array.from(objectIds);

    for (const sessionId of sessionIdList) {
      await cleanupSessionArtifacts(sessionId);
    }

    for (const sessionObjectId of sessionObjectIdList) {
      await cleanupSessionArtifacts(undefined, sessionObjectId);
    }

    const goalLabels = Array.from(new Set([
      researchGoalId,
      summary?.researchGoalId,
      statsMatch?.researchGoalId
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)));

    for (const label of goalLabels) {
      await deleteByProperty('QuestionPlan', 'researchGoalId', label);
    }
    
    let deletedSessions = 0;
    const failedSessions: Array<{ sessionId: string; error: string }> = [];
    const deletedObjectIds = new Set<string>();
    const attemptedSessionIds = new Set<string>();

    for (const rawSessionId of interviewIds) {
      const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim() : rawSessionId;
      if (!sessionId) continue;
      if (attemptedSessionIds.has(sessionId)) continue;
      attemptedSessionIds.add(sessionId);
      await cleanupSessionArtifacts(sessionId);

      try {
        const deletedWeaviateId = await deleteInterviewSessionBySessionId(sessionId);
        if (deletedWeaviateId) {
          deletedSessions += 1;
          deletedObjectIds.add(deletedWeaviateId);
          recordCleanup('InterviewSession', 1);
        } else if (/^[0-9a-fA-F-]{36}$/.test(sessionId)) {
          objectIds.add(sessionId);
        }
      } catch (error: any) {
        failedSessions.push({
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    for (const rawObjectId of objectIds) {
      const objectId = typeof rawObjectId === 'string' ? rawObjectId.trim() : rawObjectId;
      if (!objectId || deletedObjectIds.has(objectId)) {
        continue;
      }
      await cleanupSessionArtifacts(undefined, objectId);
      try {
        await deleteObjectCascade('InterviewSession', objectId);
        deletedSessions += 1;
        deletedObjectIds.add(objectId);
        recordCleanup('InterviewSession', 1);
      } catch (error: any) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const isNotFound = typeof message === 'string' && message.toLowerCase().includes('not found');
        if (!isNotFound) {
          failedSessions.push({
            sessionId: objectId,
            error: message,
          });
        }
      }
    }

    let remainingHandles = await listSessionsForResearchGoal(
      statsMatch?.researchGoalId ?? researchGoalId,
      5000
    );

    const maxCleanupPasses = 3;
    let cleanupPass = 0;

    while (remainingHandles.length > 0 && cleanupPass < maxCleanupPasses) {
      cleanupPass += 1;
      let deletedThisPass = 0;

      for (const handle of remainingHandles) {
        const cleanedSessionId =
          typeof handle.sessionId === 'string' && handle.sessionId.trim().length > 0
            ? handle.sessionId.trim()
            : '';
        const cleanedObjectId =
          typeof handle.objectId === 'string' && handle.objectId.trim().length > 0
            ? handle.objectId.trim()
            : '';

        if (cleanedSessionId || cleanedObjectId) {
          await cleanupSessionArtifacts(cleanedSessionId, cleanedObjectId);
        }

        let deletedForHandle = false;

        if (cleanedSessionId && !attemptedSessionIds.has(cleanedSessionId)) {
          attemptedSessionIds.add(cleanedSessionId);
          try {
            const deletedWeaviateId = await deleteInterviewSessionBySessionId(cleanedSessionId);
            if (deletedWeaviateId) {
              deletedSessions += 1;
              deletedObjectIds.add(deletedWeaviateId);
              recordCleanup('InterviewSession', 1);
              deletedForHandle = true;
            } else if (/^[0-9a-fA-F-]{36}$/.test(cleanedSessionId)) {
              objectIds.add(cleanedSessionId);
            }
          } catch (error: any) {
            failedSessions.push({
              sessionId: cleanedSessionId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        if (!deletedForHandle && cleanedObjectId && !deletedObjectIds.has(cleanedObjectId)) {
          try {
            await deleteObjectCascade('InterviewSession', cleanedObjectId);
            deletedSessions += 1;
            deletedObjectIds.add(cleanedObjectId);
            recordCleanup('InterviewSession', 1);
            deletedForHandle = true;
          } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const isNotFound = typeof message === 'string' && message.toLowerCase().includes('not found');
            if (!isNotFound) {
              failedSessions.push({
                sessionId: cleanedObjectId,
                error: message,
              });
            }
          }
        }

        if (deletedForHandle) {
          deletedThisPass += 1;
        }
      }

      if (deletedThisPass === 0) {
        break;
      }

      remainingHandles = await listSessionsForResearchGoal(
        statsMatch?.researchGoalId ?? researchGoalId,
        5000
      );
    }

    purgeSessionCacheForGoal();
    if (targetCanonical) {
      const lastSessionUpdatedAt =
        statsMatch?.updatedAt ??
        statsMatch?.createdAt ??
        summary?.updatedAt ??
        undefined;
      await recordBatchSummaryDeletion({
        canonicalGoalId: targetCanonical,
        goalLabel: statsMatch?.researchGoalId ?? summary?.researchGoalId ?? researchGoalId,
        lastSessionUpdatedAt
      });
    }

    const goalDocs = await listResearchGoalDocuments(2000);
    const goalIdsToDelete = new Set<string>(
      goalDocs
        .filter((doc) => canonicalizeGoalId(doc.goalText) === targetCanonical)
        .map((doc) => doc.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    if (targetCanonical) {
      goalIdsToDelete.add(uuidv5(`goal:${targetCanonical}`, uuidv5.URL));
    }

    for (const label of goalLabels) {
      const canonical = canonicalizeGoalId(label);
      if (canonical) {
        goalIdsToDelete.add(uuidv5(`goal:${canonical}`, uuidv5.URL));
      }
    }

    const deletedResearchGoals: string[] = [];
    const failedResearchGoals: Array<{ goalId: string; error: string }> = [];

    for (const goalId of goalIdsToDelete) {
      try {
        await deleteObjectCascade('ResearchGoal', goalId);
        deletedResearchGoals.push(goalId);
        recordCleanup('ResearchGoal', 1);
      } catch (error: any) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const isNotFound = typeof message === 'string' && message.toLowerCase().includes('not found');
        if (!isNotFound) {
          failedResearchGoals.push({ goalId, error: message });
        }
      }
    }

    const batchSummaryIds = new Set<string>();
    if (summary?.id) {
      batchSummaryIds.add(summary.id);
    }
    for (const label of goalLabels) {
      const trimmed = label.trim();
      if (trimmed.length > 0) {
        batchSummaryIds.add(uuidv5(`batch:${trimmed}`, uuidv5.URL));
      }
    }

    for (const summaryId of batchSummaryIds) {
      try {
        await deleteObjectCascade('BatchSummary', summaryId);
        recordCleanup('BatchSummary', 1);
      } catch (error: any) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const isNotFound = typeof message === 'string' && message.toLowerCase().includes('not found');
        if (!isNotFound) {
          failedDeletes.push({ className: 'BatchSummary', id: summaryId, error: message });
        }
      }
    }

    const remainingSessions = await listSessionsForResearchGoal(
      statsMatch?.researchGoalId ?? researchGoalId,
      5000
    );

    const remainingSummaryIds = new Set<string>();
    const maybeSummaries = await Promise.all(
      goalLabels
        .concat(researchGoalId)
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(async (label) => {
          const doc = await fetchBatchSummary(label);
          return doc?.id;
        })
    );
    maybeSummaries.forEach((id) => {
      if (typeof id === 'string' && id.trim().length > 0) {
        remainingSummaryIds.add(id.trim());
      }
    });
    const remainingGoalDocs = (await listResearchGoalDocuments(2000)).filter(
      (doc) => canonicalizeGoalId(doc.goalText) === targetCanonical
    );

    const combinedSessionKeys = new Set<string>();
    sessionHandles.forEach((handle) => {
      combinedSessionKeys.add(handle.objectId || handle.sessionId);
    });
    interviewIds.forEach((id) => combinedSessionKeys.add(id));
    objectIds.forEach((id) => combinedSessionKeys.add(id));
    console.log('[BATCH SUMMARY DELETE] Cleanup completed', {
      researchGoalId,
      deletedSessions,
      totalSessionsConsidered: combinedSessionKeys.size,
      remainingSessions: remainingSessions.length,
      remainingBatchSummaries: remainingSummaryIds.size,
      remainingGoalDocs: remainingGoalDocs.length,
      sessionCachePurgedCount: purgedSessionCacheIds.size
    });

    const responsePayload = {
      success: true,
      researchGoalId,
      deletedSessions,
      totalSessions: combinedSessionKeys.size,
      failedSessions,
      deletedResearchGoals,
      failedResearchGoals,
      cleanupCounts,
      failedDeletes,
      remainingSessions: remainingSessions.map((handle) => ({
        sessionId: handle.sessionId,
        objectId: handle.objectId,
      })),
      remainingBatchSummaryIds: Array.from(remainingSummaryIds),
      remainingResearchGoalIds: remainingGoalDocs.map((doc) => doc.id),
      sessionCachePurgedIds: Array.from(purgedSessionCacheIds),
      diagnostics: {
        interviewIds: Array.from(interviewIds),
        objectIds: Array.from(objectIds),
        sessionHandles,
        statsMatch,
      },
    };

    console.log('[BATCH SUMMARY DELETE] Result payload', responsePayload);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('DELETE /api/sessions/batch-summary/[researchGoalId] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete batch summary';
    return NextResponse.json(
      {
        error: 'Failed to delete batch summary',
        details: message
      },
      { status: 500 }
    );
  }
}
