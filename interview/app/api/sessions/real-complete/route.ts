import { NextRequest, NextResponse } from 'next/server';
import { fetchInterviewSession } from '@/lib/weaviate/weaviate-session';

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
    const { sessionId } = await request.json();

    console.log('🏁 [REAL COMPLETE] Completing real interview session:', sessionId);

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
        console.warn('⚠️ [REAL COMPLETE] Failed to load session from Weaviate:', error);
      }
    }
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session has actual transcript data
    if (!session.transcript || session.transcript.length === 0) {
      console.warn('⚠️ [REAL COMPLETE] Session has no transcript entries prior to completion', { sessionId });
    } else {
      console.log('📊 [REAL COMPLETE] Found transcript with', session.transcript.length, 'exchanges');
    }

    const transcriptPayload = Array.isArray(session.transcript) ? session.transcript : [];

    // Call the session completion API with the actual transcript
    const completionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sessions/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        transcript: transcriptPayload,
        researchGoal: session.researchGoal
      }),
    });

    if (!completionResponse.ok) {
      const errorData = await completionResponse.json();
      throw new Error(errorData.error || 'Failed to complete session');
    }

    const result = await completionResponse.json();

    console.log('✅ [REAL COMPLETE] Session completed successfully with real interview data');

    return NextResponse.json({
      success: true,
      message: 'Session completed successfully with real interview data',
      session: result.session,
      summary: result.summary,
      psychometricProfile: result.psychometricProfile
    });

  } catch (error) {
    console.error('❌ [REAL COMPLETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}
