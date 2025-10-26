import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Global session storage declaration
declare global {
  var sessionsStore: Map<string, any> | undefined;
}

// In-memory session storage - singleton to persist across API route reloads
let sessions: Map<string, any>;

if (typeof global.sessionsStore === 'undefined') {
  global.sessionsStore = new Map<string, any>();
  console.log('Session storage initialized (in-memory singleton)');
}
sessions = global.sessionsStore;

export async function POST(request: NextRequest) {
  console.log('🔵 [SESSIONS API] POST request received');
  console.log('🔵 [SESSIONS API] Request URL:', request.url);
  
  try {
    const body = await request.json();
    console.log('🔵 [SESSIONS API] Request body keys:', Object.keys(body));
    console.log('🔵 [SESSIONS API] Request body:', JSON.stringify(body, null, 2));
    
    const { script, researchGoal, adminEmail, targetAudience, duration, sensitivity } = body;

    const sessionId = uuidv4();
    const roomName = `interview-${sessionId}`;
    const sessionUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/respondent?session=${sessionId}`;

    console.log('🔵 [SESSIONS API] Creating session:', sessionId);
    console.log('🔵 [SESSIONS API] Room name:', roomName);
    console.log('🔵 [SESSIONS API] Session URL:', sessionUrl);

    // Create session data
    const session = {
      id: sessionId,
      sessionId,
      sessionUrl,
      researchGoal,
      targetAudience,
      duration,
      sensitivity,
      roomName,
      script,
      createdBy: adminEmail,
      status: 'created',
      tags: ['interview', 'research'],
      isPublic: true,
      createdAt: new Date().toISOString(),
      participantEmail: null,
      transcript: '',
      summaries: [],
      psychometricProfile: null,
      evaluationMetrics: null,
      beyondPresenceAgentId: null,
      beyondPresenceSessionId: null,
    };

    // Store session in memory
    sessions.set(sessionId, session);
    
    console.log('✅ [SESSIONS API] Session created and stored:', sessionId);
    console.log('✅ [SESSIONS API] Total sessions now:', sessions.size);
    console.log('✅ [SESSIONS API] All session IDs:', Array.from(sessions.keys()));

    return NextResponse.json({
      success: true,
      sessionId,
      sessionUrl,
      roomName,
      session
    });

  } catch (error) {
    console.error('❌ [SESSIONS API] Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('🔍 [SESSIONS API] GET request received');
  console.log('🔍 [SESSIONS API] Request URL:', request.url);
  console.log('🔍 [SESSIONS API] Total sessions in memory:', sessions.size);
  console.log('🔍 [SESSIONS API] Session IDs:', Array.from(sessions.keys()));
  
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    console.log('🔍 [SESSIONS API] Query params - sessionId:', sessionId);

    if (sessionId) {
      const session = sessions.get(sessionId);
      console.log('🔍 [SESSIONS API] Looking up session:', sessionId);
      console.log('🔍 [SESSIONS API] Session found:', !!session);
      
      if (!session) {
        console.error('❌ [SESSIONS API] Session not found:', sessionId);
        console.error('❌ [SESSIONS API] Available sessions:', Array.from(sessions.keys()));
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      console.log('✅ [SESSIONS API] Returning session:', sessionId);
      return NextResponse.json({ session });
    }

    // Return all sessions for admin dashboard
    const allSessions = Array.from(sessions.values());
    console.log('🔍 [SESSIONS API] Returning all sessions:', allSessions.length);
    return NextResponse.json({ sessions: allSessions });

  } catch (error) {
    console.error('❌ [SESSIONS API] Session retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sessions' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { sessionId, updates } = await request.json();

    const existingSession = sessions.get(sessionId);
    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update session with new data
    const updatedSession = { ...existingSession, ...updates, updatedAt: new Date().toISOString() };
    sessions.set(sessionId, updatedSession);

    return NextResponse.json({
      success: true,
      session: updatedSession
    });

  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
