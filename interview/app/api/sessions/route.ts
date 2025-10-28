import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  upsertInterviewSession,
  fetchInterviewSession,
  parseInterviewSession
} from '@/lib/weaviate/weaviate-session';
import { getWeaviateClient } from '@/lib/weaviate/weaviate-helpers';

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

async function ensureSessionLoaded(sessionId: string) {
  const cached = sessions.get(sessionId);
  if (cached) {
    return cached;
  }

  try {
    const stored = await fetchInterviewSession(sessionId);
    if (stored) {
      sessions.set(sessionId, stored);
      return stored;
    }
  } catch (error) {
    console.warn('[SESSIONS API] Failed to load session from Weaviate:', error);
  }

  try {
    const rehydratedSessions = await loadAllSessionsFromWeaviate();
    const hydrated = rehydratedSessions.find((session: any) => session.sessionId === sessionId);
    if (hydrated) {
      sessions.set(sessionId, hydrated);
      return hydrated;
    }
  } catch (rehydrateError) {
    console.warn('[SESSIONS API] Session rehydration from Weaviate failed:', rehydrateError);
  }

  return null;
}

async function loadAllSessionsFromWeaviate() {
  try {
    const client = getWeaviateClient();
    const result = await client.graphql
      .get()
      .withClassName('InterviewSession')
      .withFields(`
        sessionId
        sessionUrl
        researchGoal
        targetAudience
        duration
        sensitivity
        participantEmail
        participantName
        roomName
        status
        startTime
        endTime
        durationMinutes
        script
        transcript
        insights
        psychometricProfile
        keyFindings
        summary
        createdAt
        updatedAt
        createdBy
        tags
        isPublic
        accessCode
      `)
      .withLimit(200)
      .do();

    const storedSessions = result.data?.Get?.InterviewSession || [];
    const parsedSessions = storedSessions
      .map((session: any) => parseInterviewSession(session))
      .filter(Boolean);

    parsedSessions.forEach((session: any) => {
      sessions.set(session.sessionId, session);
    });

    return Array.from(parsedSessions);
  } catch (error) {
    console.warn('[SESSIONS API] Failed to load sessions from Weaviate:', error);
    return [];
  }
}

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
    const sessionUrl = `http://localhost:3000/respondent?session=${sessionId}`;

    console.log('🔵 [SESSIONS API] Creating session:', sessionId);
    console.log('🔵 [SESSIONS API] Room name:', roomName);
    console.log('🔵 [SESSIONS API] Session URL:', sessionUrl);

    // Create session data
    const session = {
      id: sessionId,
      sessionId,
      sessionUrl,
      researchGoal: researchGoal || '',
      targetAudience: targetAudience || '',
      duration: duration || 30,
      sensitivity: sensitivity || 'low',
      roomName,
      script,
      createdBy: adminEmail,
      status: 'created',
      tags: ['interview', 'research'],
      isPublic: true,
      createdAt: new Date().toISOString(),
      participantEmail: null,
      transcript: [],
      summaries: [],
      psychometricProfile: null,
      evaluationMetrics: null,
      beyondPresenceAgentId: null,
      beyondPresenceSessionId: null,
    };

    // Store session in memory and Weaviate
    sessions.set(sessionId, session);
    try {
      await upsertInterviewSession(session);
    } catch (weaviateError) {
      console.warn('⚠️ [SESSIONS API] Failed to persist session to Weaviate:', weaviateError);
    }
    
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
      let session = sessions.get(sessionId);
      console.log('🔍 [SESSIONS API] Looking up session:', sessionId);
      console.log('🔍 [SESSIONS API] Session found:', !!session);
      
      if (!session) {
        session = await ensureSessionLoaded(sessionId);
      }

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
    let allSessions = Array.from(sessions.values());
    if (allSessions.length === 0) {
      allSessions = await loadAllSessionsFromWeaviate();
    }

    console.log('🔍 [SESSIONS API] Returning all sessions:', allSessions.length);
    console.log('🔍 [SESSIONS API] Session details:');
    allSessions.forEach((session, index) => {
      console.log(`  ${index + 1}. ID: ${session.sessionId}`);
      console.log(`     Research Goal: ${session.researchGoal}`);
      console.log(`     Status: ${session.status}`);
      console.log(`     Created: ${session.createdAt}`);
      console.log(`     Transcript length: ${session.transcript?.length || 0}`);
    });
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

    let existingSession = sessions.get(sessionId);
    if (!existingSession) {
      existingSession = await ensureSessionLoaded(sessionId);
    }
    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update session with new data while preserving critical fields
    const updatedSession = { 
      ...existingSession,  
      ...updates,
      // PRESERVE these critical fields from original session
      researchGoal: existingSession.researchGoal,
      targetAudience: existingSession.targetAudience,
      script: existingSession.script,
      createdBy: existingSession.createdBy,
      createdAt: existingSession.createdAt,
      sessionId: existingSession.sessionId,
      sessionUrl: existingSession.sessionUrl,
      roomName: existingSession.roomName,
      tags: existingSession.tags,
      isPublic: existingSession.isPublic,
      updatedAt: new Date().toISOString() 
    };
    sessions.set(sessionId, updatedSession);
    try {
      await upsertInterviewSession(updatedSession);
    } catch (weaviateError) {
      console.warn('⚠️ [SESSIONS API] Failed to persist updated session to Weaviate:', weaviateError);
    }

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
