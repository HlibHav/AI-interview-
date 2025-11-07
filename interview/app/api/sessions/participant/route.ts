"use server";

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchInterviewSession,
  upsertInterviewSession
} from '@/lib/weaviate/weaviate-session';
import { emitPipelineEvent } from '@/lib/events/pipeline-events';

declare global {
  // eslint-disable-next-line no-var
  var sessionsStore: Map<string, any> | undefined;
}

let sessions: Map<string, any>;
if (typeof global.sessionsStore === 'undefined') {
  global.sessionsStore = new Map<string, any>();
}
sessions = global.sessionsStore;

export async function POST(request: NextRequest) {
  try {
    const { sessionId, participantEmail } = await request.json();

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }
    if (!participantEmail || typeof participantEmail !== 'string') {
      return NextResponse.json(
        { success: false, error: 'participantEmail is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = participantEmail.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'participantEmail must be valid' },
        { status: 400 }
      );
    }

    let session = sessions.get(sessionId);
    if (!session) {
      session = await fetchInterviewSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }
      sessions.set(sessionId, session);
    }

    if ((session.participantEmail || '').toLowerCase() === normalizedEmail) {
      return NextResponse.json({ success: true, session });
    }

    const updatedSession = {
      ...session,
      participantEmail: normalizedEmail,
      updatedAt: new Date().toISOString()
    };

    sessions.set(sessionId, updatedSession);

    try {
      await upsertInterviewSession(updatedSession);
    } catch (error) {
      console.error('⚠️ [SESSION PARTICIPANT] Failed to persist session', error);
    }

    emitPipelineEvent({
      type: 'pipeline:session:updated',
      sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        stage: 'participant',
        participantEmail: normalizedEmail,
        researchGoal: updatedSession.researchGoal
      }
    });

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error('❌ [SESSION PARTICIPANT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update participant email' },
      { status: 500 }
    );
  }
}

