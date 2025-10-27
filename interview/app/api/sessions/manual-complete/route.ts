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

    console.log('🔄 [MANUAL COMPLETE] Completing session:', sessionId);

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
        console.warn('⚠️ [MANUAL COMPLETE] Failed to load session from Weaviate:', error);
      }
    }
    if (!session) {
      console.log('❌ [MANUAL COMPLETE] Session not found:', sessionId);
      console.log('❌ [MANUAL COMPLETE] Available sessions:', Array.from(sessions.keys()));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session not found. Please create a new session.',
          availableSessions: Array.from(sessions.keys()),
          totalSessions: sessions.size
        },
        { status: 404 }
      );
    }

    // Use the actual session transcript if available, otherwise return error
    let transcriptToUse = session.transcript || [];
    
    // If no transcript exists, return error instead of generating fake data
    if (!transcriptToUse || transcriptToUse.length === 0) {
      console.log('❌ [MANUAL COMPLETE] No transcript found for session:', sessionId);
      console.log('❌ [MANUAL COMPLETE] Session data:', JSON.stringify(session, null, 2));
      return NextResponse.json(
        { 
          success: false, 
          error: 'No transcript data found. Please conduct an interview first.',
          sessionStatus: session.status,
          hasTranscript: !!session.transcript,
          transcriptLength: session.transcript?.length || 0
        },
        { status: 400 }
      );
    }

    console.log('📝 [MANUAL COMPLETE] Using transcript with', transcriptToUse.length, 'exchanges');

    // Call the session completion API
    const completionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sessions/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        transcript: transcriptToUse,
        researchGoal: session.researchGoal
      }),
    });

    if (!completionResponse.ok) {
      throw new Error('Failed to complete session');
    }

    const result = await completionResponse.json();

    console.log('✅ [MANUAL COMPLETE] Session completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Session completed successfully',
      session: result.session
    });

  } catch (error) {
    console.error('❌ [MANUAL COMPLETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}
