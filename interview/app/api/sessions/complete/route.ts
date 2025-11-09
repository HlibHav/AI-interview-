import { NextRequest, NextResponse } from 'next/server';
import {
  upsertInterviewSession,
  upsertInterviewChunks,
  upsertTranscriptDocument,
  fetchInterviewSession
} from '@/lib/weaviate/weaviate-session';
import { runACECycle } from '@/lib/playbook/playbook-orchestrator';
import { computeAndPersistBatchSummary } from '@/lib/aggregations/batchSummary';
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

export async function POST(request: NextRequest) {
  let requestSessionId: string | null = null;
  try {
    const { sessionId, transcript, researchGoal } = await request.json();
    requestSessionId = sessionId;

    console.log('🏁 [SESSION COMPLETE] Completing session:', sessionId);
    console.log('🏁 [SESSION COMPLETE] Research goal:', researchGoal);
    console.log('🏁 [SESSION COMPLETE] Transcript length:', transcript?.length || 0);

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session from memory store
    let session = sessions.get(sessionId);
    if (!session) {
      try {
        session = await fetchInterviewSession(sessionId);
        if (session) {
          sessions.set(sessionId, session);
        }
      } catch (error) {
        console.warn('⚠️ [SESSION COMPLETE] Failed to load session from Weaviate:', error);
      }
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // PRESERVE original session data - don't let updates overwrite critical fields
    const preservedSession = {
      researchGoal: session.researchGoal, // Keep original research goal
      targetAudience: session.targetAudience,
      script: session.script,
      createdBy: session.createdBy,
      createdAt: session.createdAt,
      sessionId: session.sessionId,
      sessionUrl: session.sessionUrl,
      roomName: session.roomName,
      tags: session.tags,
      isPublic: session.isPublic,
      participantEmail: session.participantEmail,
      participantName: session.participantName,
      beyondPresenceAgentId: session.beyondPresenceAgentId,
      beyondPresenceSessionId: session.beyondPresenceSessionId,
      psychometricProfile: session.psychometricProfile
    };

    // Generate summary using OpenAI
    let sessionSummary: any = null;
    let sessionSummaryMetadata: any = null;
    let psychometricProfile: any = session.psychometricProfile ?? null;
    let psychometricMetadata: any = null;

    try {
      // Call summarizer agent
      const summarizerResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/agents/summarizer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript,
          researchGoal: session.researchGoal, // Use original research goal
          sessionUuid: sessionId
        }),
      });

      if (summarizerResponse.ok) {
        const summarizerPayload = await summarizerResponse.json();
        sessionSummary = summarizerPayload?.summary ?? null;
        sessionSummaryMetadata = summarizerPayload;
        console.log('✅ [SESSION COMPLETE] Summary generated successfully');
        emitPipelineEvent({
          type: 'pipeline:summary:completed',
          sessionId,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('❌ [SESSION COMPLETE] Failed to generate summary');
      }

    } catch (error) {
      console.error('❌ [SESSION COMPLETE] Error calling summarizer agent:', error);
      // Continue without summary - don't fail the entire completion
    }

    // Update session with completion data while preserving original fields
    const sessionPGJ = derivePainGainJobsFromSummary(sessionSummary ?? {});

    const updatedSession = {
      ...preservedSession,
      transcript: transcript,
      summaries: sessionSummary ? [sessionSummary] : [],
      pains: sessionPGJ.pains,
      gains: sessionPGJ.gains,
      jobs: sessionPGJ.jobs,
      psychometricProfile: psychometricProfile,
      status: 'completed',
      endTime: new Date().toISOString(),
      durationMinutes: transcript ? Math.round(transcript.length * 2) : 0, // Estimate 2 minutes per exchange
      summary: sessionSummary?.summary || '',
      keyFindings: sessionSummary?.keyInsights || [],
      updatedAt: new Date().toISOString()
    };

    // Store updated session in memory
    sessions.set(sessionId, updatedSession);

    console.log('✅ [SESSION COMPLETE] Session completed and stored in memory', {
      sessionId,
      transcriptEntries: Array.isArray(updatedSession.transcript) ? updatedSession.transcript.length : 0,
      status: updatedSession.status
    });
    console.log('✅ [SESSION COMPLETE] Final research goal:', updatedSession.researchGoal);

    // ALSO store in Weaviate
    try {
      const weaviateSessionId = await upsertInterviewSession(updatedSession);
      console.log('✅ [SESSION COMPLETE] Upserted InterviewSession in Weaviate', {
        sessionId,
        weaviateSessionId
      });

      if (Array.isArray(updatedSession.transcript) && updatedSession.transcript.length > 0) {
        await upsertTranscriptDocument(sessionId, weaviateSessionId, updatedSession.transcript);

        const chunksStored = await upsertInterviewChunks(
          sessionId,
          weaviateSessionId,
          updatedSession.transcript
        );
        console.log('✅ [SESSION COMPLETE] Upserted transcript chunks', {
          sessionId,
          chunksStored
        });
      } else {
        console.log('ℹ️ [SESSION COMPLETE] No transcript entries to store');
      }

      // Run ACE cycle (Generator → Reflection → Curator) to evolve playbook
      // Only run if we have a research goal to associate the playbook with
      const researchGoalForPlaybook = (updatedSession.researchGoal || '').trim();
      if (researchGoalForPlaybook) {
        try {
          // Use research goal text as the ID for playbook association
          const aceResult = await runACECycle({
            sessionId,
            researchGoalId: researchGoalForPlaybook, // Use research goal text as ID
            transcript: updatedSession.transcript || [],
            participantResponses: (updatedSession.transcript || []).filter(
              (e: any) => e.speaker === 'participant' || e.speaker === 'user'
            ),
            interviewerActions: (updatedSession.transcript || []).filter(
              (e: any) => e.speaker === 'agent' || e.speaker === 'ai'
            ),
            researchGoal: researchGoalForPlaybook,
            sessionOutcome: 'success', // Could be determined by analysis
            executionFeedback: `Interview completed with ${updatedSession.transcript?.length || 0} exchanges`
          });
          console.log('✅ [SESSION COMPLETE] ACE cycle completed', {
            sessionId,
            playbookId: aceResult.playbookId,
            playbookVersion: aceResult.playbookVersion,
            newStrategies: aceResult.curatorOperations
          });
        } catch (aceError) {
          console.warn('⚠️ [SESSION COMPLETE] ACE cycle failed (non-critical):', aceError);
        }
      } else {
        console.log('ℹ️ [SESSION COMPLETE] Skipping ACE cycle - no research goal available');
      }

      // Now call psychometric agent with the weaviateSessionId
      const shouldGeneratePsychometrics = !psychometricProfile;

      if (shouldGeneratePsychometrics) {
        try {
          console.log('🧠 [SESSION COMPLETE] Calling psychometric agent with weaviateSessionId:', weaviateSessionId);
          const psychometricResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/agents/psychometric`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fullTranscript: transcript,
              researchGoal: session.researchGoal, // Use original research goal
              summaries: sessionSummary ? [sessionSummary] : [],
              sessionUuid: sessionId,
              weaviateSessionId: weaviateSessionId
            }),
          });

          if (psychometricResponse.ok) {
            const psychometricPayload = await psychometricResponse.json();
            psychometricProfile = psychometricPayload?.profile ?? null;
            psychometricMetadata = psychometricPayload;
            console.log('✅ [SESSION COMPLETE] Psychometric profile generated successfully');
            emitPipelineEvent({
              type: 'pipeline:psychometrics:completed',
              sessionId,
              timestamp: new Date().toISOString()
            });
            
            // Update the session with the psychometric profile
            updatedSession.psychometricProfile = psychometricProfile;
            sessions.set(sessionId, updatedSession);
            
            // Update in Weaviate as well
            await upsertInterviewSession(updatedSession);
            console.log('✅ [SESSION COMPLETE] Updated InterviewSession with psychometric profile');
          } else {
            console.error('❌ [SESSION COMPLETE] Failed to generate psychometric profile');
          }
        } catch (psychometricError) {
          console.error('❌ [SESSION COMPLETE] Error calling psychometric agent:', psychometricError);
          // Continue - session is still stored without psychometric profile
        }
      } else {
        console.log('ℹ️ [SESSION COMPLETE] Psychometric profile already exists, skipping regeneration', {
          sessionId
        });
      }

      console.log('✅ [SESSION COMPLETE] Session stored in Weaviate successfully');

      const goalForBatch = (updatedSession.researchGoal || '').trim();
      if (goalForBatch) {
        try {
          const batch = await computeAndPersistBatchSummary(goalForBatch);
          if (batch) {
            console.log('✅ [SESSION COMPLETE] Batch summary updated', {
              researchGoalId: goalForBatch,
              interviewCount: batch.interviewIds.length
            });
            emitPipelineEvent({
              type: 'pipeline:batch-summary:completed',
              sessionId,
              timestamp: new Date().toISOString(),
              payload: { researchGoalId: goalForBatch }
            });
          } else {
            console.log('ℹ️ [SESSION COMPLETE] Batch summary skipped (no completed interviews)', {
              researchGoalId: goalForBatch
            });
          }
        } catch (batchError) {
          console.error('⚠️ [SESSION COMPLETE] Failed to compute batch summary', {
            researchGoalId: goalForBatch,
            error: batchError instanceof Error ? batchError.message : batchError
          });
        }
      }

    } catch (weaviateError) {
      console.error('⚠️ [SESSION COMPLETE] Failed to store in Weaviate:', weaviateError);
      // Continue - session is still stored in memory
    }

    emitPipelineEvent({
      type: 'pipeline:finished',
      sessionId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
      summary: sessionSummary,
      summaryMetadata: sessionSummaryMetadata,
      psychometricProfile: psychometricProfile,
      psychometricMetadata
    });

  } catch (error) {
    emitPipelineEvent({
      type: 'pipeline:failed',
      sessionId: requestSessionId || 'unknown',
      timestamp: new Date().toISOString(),
      payload: { message: error instanceof Error ? error.message : String(error) }
    });
    console.error('❌ [SESSION COMPLETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}
