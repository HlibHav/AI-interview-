import { NextRequest, NextResponse } from 'next/server';
import {
  upsertInterviewSession,
  fetchInterviewSession,
  normalizeTranscriptEntries,
  upsertInterviewChunks,
  type TranscriptChunkInput
} from '@/lib/weaviate/weaviate-session';
import { batchEnrichTranscriptChunks } from '@/lib/analysis/enrich-transcript';
import { derivePainGainJobsFromSummary } from '@/lib/analysis/pain-gain-jobs';
import { emitPipelineEvent } from '@/lib/events/pipeline-events';

// Global session storage declaration
declare global {
  var sessionsStore: Map<string, any> | undefined;
}

let sessions: Map<string, any>;

if (typeof global.sessionsStore === 'undefined') {
  global.sessionsStore = new Map<string, any>();
}
sessions = global.sessionsStore;

function asTranscriptEntries(payload: any): any[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [payload];
}

async function updateSessionSummary({
  sessionId,
  updatedSession,
  newEntries,
  previousSummary
}: {
  sessionId: string;
  updatedSession: any;
  newEntries: any[];
  previousSummary: any;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/agents/summarizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        newEntries,
        researchGoal: updatedSession.researchGoal,
        existingSummary: previousSummary || null,
        sessionContext: {
          sessionId,
          participantName: updatedSession.participantName,
          participantEmail: updatedSession.participantEmail,
          targetAudience: updatedSession.targetAudience,
          durationMinutes: updatedSession.durationMinutes,
          adminEmail: updatedSession.adminEmail
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('⚠️ [UPDATE TRANSCRIPT] Incremental summary request failed', {
        sessionId,
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return;
    }

    const payload = await response.json();
    const summaryRecord = payload?.summary;

    if (!summaryRecord) {
      console.warn('⚠️ [UPDATE TRANSCRIPT] Summarizer returned no summary payload', {
        sessionId
      });
      return;
    }

    const sessionPGJ = derivePainGainJobsFromSummary(summaryRecord ?? {});

    updatedSession.summaries = [summaryRecord];
    updatedSession.summary = summaryRecord.summary || '';
    updatedSession.keyFindings = Array.isArray(summaryRecord.insights)
      ? summaryRecord.insights
      : [];
    updatedSession.pains = sessionPGJ.pains;
    updatedSession.gains = sessionPGJ.gains;
    updatedSession.jobs = sessionPGJ.jobs;
    updatedSession.updatedAt = new Date().toISOString();

    sessions.set(sessionId, updatedSession);
    emitPipelineEvent({
      type: 'pipeline:session:updated',
      sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        stage: 'summary',
        researchGoal: updatedSession.researchGoal
      }
    });

    try {
      const weaviateSessionId = await upsertInterviewSession(updatedSession);
      updatedSession.weaviateId = weaviateSessionId;
      console.log('✅ [UPDATE TRANSCRIPT] Session summary updated', {
        sessionId
      });
    } catch (summaryPersistError) {
      console.error('⚠️ [UPDATE TRANSCRIPT] Failed to persist updated summary:', summaryPersistError);
    }
  } catch (summaryError) {
    console.error('❌ [UPDATE TRANSCRIPT] Error requesting incremental summary:', summaryError);
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      sessionId,
      transcript,
      beyondPresenceAgentId,
      beyondPresenceSessionId,
      participantEmail
    } = await request.json();

    console.log('🛰️ [UPDATE TRANSCRIPT] Incoming request', {
      sessionId,
      entries: transcript?.length || 0,
      hasBeyAgentId: Boolean(beyondPresenceAgentId)
    });

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session from memory or Weaviate
    let session = sessions.get(sessionId);
    if (!session) {
      try {
        session = await fetchInterviewSession(sessionId);
        if (session) {
          sessions.set(sessionId, session);
        }
      } catch (error) {
        console.warn('⚠️ [UPDATE TRANSCRIPT] Failed to load session from Weaviate:', error);
      }
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const priorTranscript = Array.isArray(session.transcript)
      ? session.transcript
      : [];

    let incomingNormalized = normalizeTranscriptEntries(
      asTranscriptEntries(transcript)
    );

    let combinedTranscript = priorTranscript.slice();
    let newEntries = incomingNormalized;

    if (incomingNormalized.length > 0) {
      if (incomingNormalized.length >= priorTranscript.length) {
        // Treat payload as the full transcript and compute delta
        newEntries = incomingNormalized.slice(priorTranscript.length);
        combinedTranscript = incomingNormalized;
      } else {
        // Treat payload as incremental entries
        newEntries = incomingNormalized;
        combinedTranscript = priorTranscript.concat(incomingNormalized);
      }
    } else {
      newEntries = [];
      combinedTranscript = priorTranscript;
    }

    // Ensure every new entry has a timestamp
    const timestampedNewEntries = newEntries.map((entry, index) => ({
      ...entry,
      timestamp: entry.timestamp || new Date(Date.now() + index).toISOString()
    }));

    if (timestampedNewEntries.length > 0) {
      if (incomingNormalized.length >= priorTranscript.length) {
        combinedTranscript = combinedTranscript
          .slice(0, combinedTranscript.length - timestampedNewEntries.length)
          .concat(timestampedNewEntries);
      } else {
        combinedTranscript = priorTranscript.concat(timestampedNewEntries);
      }
    }

    const normalizedEmail =
      typeof participantEmail === 'string' && participantEmail.trim().includes('@')
        ? participantEmail.trim().toLowerCase()
        : undefined;

    const latestSnapshot = sessions.get(sessionId);
    const baseSession =
      latestSnapshot && latestSnapshot !== session ? latestSnapshot : session;

    const normalizedBaseEmail = (baseSession.participantEmail || '').toLowerCase();
    const emailChanged =
      typeof normalizedEmail === 'string' &&
      normalizedEmail.length > 0 &&
      normalizedEmail !== normalizedBaseEmail;

    const updatedSession = {
      ...baseSession,
      transcript: combinedTranscript,
      beyondPresenceAgentId: beyondPresenceAgentId || baseSession.beyondPresenceAgentId,
      beyondPresenceSessionId:
        beyondPresenceSessionId || baseSession.beyondPresenceSessionId,
      status:
        baseSession.status === 'created' || baseSession.status === 'in_progress'
          ? 'in_progress'
          : baseSession.status,
      startTime: baseSession.startTime || new Date().toISOString()
    };

    if (emailChanged && normalizedEmail) {
      updatedSession.participantEmail = normalizedEmail;
    }

    if (
      latestSnapshot &&
      latestSnapshot !== session
    ) {
      if (
        typeof latestSnapshot.status === 'string' &&
        latestSnapshot.status.toLowerCase() === 'completed'
      ) {
        updatedSession.status = latestSnapshot.status;
      }
      if (
        latestSnapshot.psychometricProfile &&
        !updatedSession.psychometricProfile
      ) {
        updatedSession.psychometricProfile = latestSnapshot.psychometricProfile;
      }
    }

    // Update in memory store and persist to Weaviate
    sessions.set(sessionId, updatedSession);
    if (emailChanged || timestampedNewEntries.length > 0) {
      emitPipelineEvent({
        type: 'pipeline:session:updated',
        sessionId,
        timestamp: new Date().toISOString(),
        payload: {
          stage: 'transcript',
          researchGoal: updatedSession.researchGoal,
          participantEmail: updatedSession.participantEmail
        }
      });
    }
    try {
      const weaviateSessionId = await upsertInterviewSession(updatedSession);
      updatedSession.weaviateId = weaviateSessionId;
      console.log('✅ [UPDATE TRANSCRIPT] Persisted session to Weaviate', {
        sessionId,
        entries: updatedSession.transcript.length
      });

      if (timestampedNewEntries.length > 0 && weaviateSessionId) {
        try {
          // Enrich transcript entries with analysis (emotion, contradiction, category, guardrails)
          const enrichedEntries = await batchEnrichTranscriptChunks(
            timestampedNewEntries.map((entry) => ({
              speaker: entry.speaker,
              text: entry.text,
              timestamp: entry.timestamp,
              turnIndex: combinedTranscript.indexOf(entry),
              summary: (entry as any).summary,
              keywords: (entry as any).keywords,
              sentiment: (entry as any).sentiment
            })) as TranscriptChunkInput[],
            {
              sessionId,
              researchGoal: baseSession.researchGoal,
              sensitivity: baseSession.sensitivity || 'medium',
              previousMood: baseSession.transcript
                ?.filter((e: any) => e.speaker === 'participant' || e.speaker === 'user')
                .slice(-1)[0]?.participantMood
            }
          );

          const chunksInserted = await upsertInterviewChunks(
            sessionId,
            weaviateSessionId,
            enrichedEntries
          );
          console.log('✅ [UPDATE TRANSCRIPT] Stored new enriched transcript chunks', {
            sessionId,
            newEntries: timestampedNewEntries.length,
            enrichedEntries: enrichedEntries.length,
            chunksInserted
          });
          const previousSummary =
            baseSession.summaries?.[0] ||
            (baseSession.summary
              ? {
                  summary: baseSession.summary,
                  insights: baseSession.keyFindings || []
                }
              : null);
          await updateSessionSummary({
            sessionId,
            updatedSession,
            newEntries: timestampedNewEntries,
            previousSummary
          });
        } catch (chunkError) {
          console.error('❌ [UPDATE TRANSCRIPT] Failed to store new chunks:', chunkError);
        }
      }
    } catch (weaviateError) {
      console.warn('⚠️ [UPDATE TRANSCRIPT] Failed to persist transcript to Weaviate:', weaviateError);
    }

    console.log('✅ [UPDATE TRANSCRIPT] Transcript updated in memory');

    return NextResponse.json({
      success: true,
      message: 'Transcript updated successfully',
      session: updatedSession
    });

  } catch (error) {
    console.error('❌ [UPDATE TRANSCRIPT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update transcript' },
      { status: 500 }
    );
  }
}
