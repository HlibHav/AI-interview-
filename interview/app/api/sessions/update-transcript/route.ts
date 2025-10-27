import { NextRequest, NextResponse } from 'next/server';
import {
  upsertInterviewSession,
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
    const { sessionId, transcript, beyondPresenceAgentId } = await request.json();

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

    // Update session with transcript
    const updatedSession = {
      ...session,
      transcript: transcript || [],
      beyondPresenceAgentId: beyondPresenceAgentId || session.beyondPresenceAgentId,
      status: session.status === 'created' ? 'in_progress' : session.status,
      startTime: session.startTime || new Date().toISOString()
    };

    // Update in memory store and persist to Weaviate
    sessions.set(sessionId, updatedSession);
    try {
      await upsertInterviewSession(updatedSession);
      console.log('✅ [UPDATE TRANSCRIPT] Persisted session to Weaviate', {
        sessionId,
        entries: updatedSession.transcript.length
      });
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
