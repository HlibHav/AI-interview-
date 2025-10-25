import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In-memory session storage with persistence
const sessions = new Map<string, any>();

// Load sessions from localStorage on server start (simplified persistence)
if (typeof window === 'undefined') {
  // Server-side: Initialize with empty sessions
  // In production, this would connect to a database
  console.log('Session storage initialized (in-memory)');
}

export async function POST(request: NextRequest) {
  try {
    const { script, researchGoal, adminEmail, targetAudience, duration, sensitivity } = await request.json();

    const sessionId = uuidv4();
    const roomName = `interview-${sessionId}`;
    const sessionUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/respondent?session=${sessionId}`;

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
      livekitConnected: false,
    };

    // Store session in memory
    sessions.set(sessionId, session);

    return NextResponse.json({
      success: true,
      sessionId,
      sessionUrl,
      roomName,
      session
    });

  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ session });
    }

    // Return all sessions for admin dashboard
    const allSessions = Array.from(sessions.values());
    return NextResponse.json({ sessions: allSessions });

  } catch (error) {
    console.error('Session retrieval error:', error);
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
