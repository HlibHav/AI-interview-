import { NextRequest, NextResponse } from 'next/server';
import {
  upsertInterviewSession,
  upsertInterviewChunks,
  upsertTranscriptDocument,
  fetchInterviewSession
} from '@/lib/weaviate/weaviate-session';

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
  try {
    const { sessionId, transcript, researchGoal } = await request.json();

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
      isPublic: session.isPublic
    };

    // Generate summary using OpenAI
    let sessionSummary: any = null;
    let sessionSummaryMetadata: any = null;
    let psychometricProfile: any = null;
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
      } else {
        console.error('❌ [SESSION COMPLETE] Failed to generate summary');
      }

    } catch (error) {
      console.error('❌ [SESSION COMPLETE] Error calling summarizer agent:', error);
      // Continue without summary - don't fail the entire completion
    }

    // Update session with completion data while preserving original fields
    const updatedSession = {
      ...preservedSession,
      transcript: transcript,
      summaries: sessionSummary ? [sessionSummary] : [],
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

      // Now call psychometric agent with the weaviateSessionId
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

      console.log('✅ [SESSION COMPLETE] Session stored in Weaviate successfully');

    } catch (weaviateError) {
      console.error('⚠️ [SESSION COMPLETE] Failed to store in Weaviate:', weaviateError);
      // Continue - session is still stored in memory
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
      summary: sessionSummary,
      summaryMetadata: sessionSummaryMetadata,
      psychometricProfile: psychometricProfile,
      psychometricMetadata
    });

  } catch (error) {
    console.error('❌ [SESSION COMPLETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}
