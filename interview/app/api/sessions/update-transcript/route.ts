import { NextRequest, NextResponse } from 'next/server';

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
    const { sessionId, transcript } = await request.json();

    console.log('📝 [UPDATE TRANSCRIPT] Updating transcript for session:', sessionId);
    console.log('📝 [UPDATE TRANSCRIPT] Transcript entries:', transcript?.length || 0);

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session from memory store
    const session = sessions.get(sessionId);
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
      status: session.status === 'created' ? 'in_progress' : session.status,
      startTime: session.startTime || new Date().toISOString()
    };

    // Update in memory store
    sessions.set(sessionId, updatedSession);

    console.log('✅ [UPDATE TRANSCRIPT] Transcript updated successfully');

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
