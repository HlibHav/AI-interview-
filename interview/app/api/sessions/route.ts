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

async function getSessionsFromWeaviate(researchGoalFilter?: string) {
  try {
    const weaviate = (await import('weaviate-ts-client')).default;
    const weaviateHost = process.env.WEAVIATE_HOST || 'localhost:8081';
    const isCloud = weaviateHost.includes('.weaviate.network') || weaviateHost.includes('.weaviate.cloud');
    
    const client = weaviate.client({
      scheme: isCloud ? 'https' : 'http',
      host: weaviateHost,
      apiKey: process.env.WEAVIATE_API_KEY as any,
    });

    let query = client.graphql
      .get()
      .withClassName('InterviewSession')
      .withFields(`
        sessionId
        sessionUrl
        researchGoal
        researchGoalId
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
      `);
    
    // NEW: Add research goal filtering
    if (researchGoalFilter) {
      query = query.withWhere({
        path: ['researchGoal'],
        operator: 'Equal',
        valueText: researchGoalFilter
      });
    }
    
    const result = await query.withLimit(100).do();
    return result.data.Get.InterviewSession || [];
  } catch (error) {
    console.error('Error fetching sessions from Weaviate:', error);
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

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const roomName = `interview-${sessionId}`;
    const sessionUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/respondent?session=${sessionId}`;

    console.log('🔵 [SESSIONS API] Creating session:', sessionId);
    console.log('🔵 [SESSIONS API] Room name:', roomName);
    console.log('🔵 [SESSIONS API] Session URL:', sessionUrl);

          // Create session data
          const session = {
            id: sessionId,
            sessionId,
            sessionUrl,
            researchGoal,
            researchGoalId: `rg-${Buffer.from(researchGoal).toString('base64').substring(0, 16)}`,  // NEW: Generate tenant ID
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

    console.log('✅ [SESSIONS API] Session created successfully');

    return NextResponse.json({
      success: true,
      sessionId,
      sessionUrl,
      message: 'Session created successfully'
    });

  } catch (error) {
    console.error('❌ [SESSIONS API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    console.log('📋 [SESSIONS GET] Request received', { sessionId });

    // If a specific sessionId is requested, return only that session
    if (sessionId) {
      console.log(`🔍 [SESSIONS GET] Fetching specific session: ${sessionId}`);
      
      // Try to get from Weaviate first
      try {
        const weaviate = (await import('weaviate-ts-client')).default;
        const client = weaviate.client({
          scheme: 'http',
          host: 'localhost:8081',
        });

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
          .withWhere({
            path: ['sessionId'],
            operator: 'Equal',
            valueText: sessionId
          })
          .do();

        if (result.data?.Get?.InterviewSession?.length > 0) {
          const session = result.data.Get.InterviewSession[0];
          
          // Parse JSON fields
          if (session.script) {
            try {
              session.script = JSON.parse(session.script);
            } catch (e) {
              console.warn('Failed to parse script JSON:', e);
            }
          }
          
          if (session.transcript) {
            try {
              session.transcript = JSON.parse(session.transcript);
            } catch (e) {
              console.warn('Failed to parse transcript JSON:', e);
            }
          }
          
          if (session.insights) {
            try {
              session.insights = JSON.parse(session.insights);
            } catch (e) {
              console.warn('Failed to parse insights JSON:', e);
            }
          }
          
          if (session.psychometricProfile) {
            try {
              session.psychometricProfile = JSON.parse(session.psychometricProfile);
            } catch (e) {
              console.warn('Failed to parse psychometric profile JSON:', e);
            }
          }

          console.log(`✅ [SESSIONS GET] Found session in Weaviate: ${sessionId}`);
          return NextResponse.json({
            success: true,
            session: session
          });
        }
      } catch (error) {
        console.error('⚠️ [SESSIONS GET] Weaviate fetch failed:', error);
      }

      // Fallback to memory store
      const memorySession = sessions.get(sessionId);
      if (memorySession) {
        console.log(`✅ [SESSIONS GET] Found session in memory: ${sessionId}`);
        return NextResponse.json({
          success: true,
          session: memorySession
        });
      }

      console.log(`❌ [SESSIONS GET] Session not found: ${sessionId}`);
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // If no specific sessionId, return all sessions (existing logic)
    console.log('📋 [SESSIONS GET] Fetching all sessions');

    // Try to get sessions from Weaviate first
    let weaviateSessions = [];
    try {
      weaviateSessions = await getSessionsFromWeaviate();
      console.log(`📊 [SESSIONS GET] Found ${weaviateSessions.length} sessions in Weaviate`);
    } catch (error) {
      console.error('⚠️ [SESSIONS GET] Weaviate fetch failed:', error);
    }

    // Also get sessions from memory store
    const memorySessions = Array.from(sessions.values());
    console.log(`💾 [SESSIONS GET] Found ${memorySessions.length} sessions in memory`);

    // Merge sessions, prioritizing Weaviate data but keeping memory sessions that might not be in Weaviate
    const allSessions = [...weaviateSessions];
    
    // Add memory sessions that aren't already in Weaviate
    for (const memorySession of memorySessions) {
      const existsInWeaviate = weaviateSessions.some(
        (ws: any) => ws.sessionId === memorySession.sessionId
      );
      if (!existsInWeaviate) {
        allSessions.push(memorySession);
      }
    }

    // Sort by creation date (newest first)
    allSessions.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startTime || 0);
      const dateB = new Date(b.createdAt || b.startTime || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Parse JSON strings in Weaviate data
    const parsedSessions = allSessions.map(session => {
      const parsed = { ...session };
      
      // Parse JSON strings
      if (typeof parsed.script === 'string') {
        try {
          parsed.script = JSON.parse(parsed.script);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      
      if (typeof parsed.transcript === 'string') {
        try {
          parsed.transcript = JSON.parse(parsed.transcript);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      
      if (typeof parsed.insights === 'string') {
        try {
          parsed.insights = JSON.parse(parsed.insights);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      
      if (typeof parsed.psychometricProfile === 'string') {
        try {
          parsed.psychometricProfile = JSON.parse(parsed.psychometricProfile);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }

      return parsed;
    });

    console.log(`✅ [SESSIONS GET] Returning ${parsedSessions.length} total sessions`);

    return NextResponse.json({
      success: true,
      sessions: parsedSessions,
      total: parsedSessions.length
    });

  } catch (error) {
    console.error('❌ [SESSIONS GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}