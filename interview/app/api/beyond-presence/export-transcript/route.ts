import { NextRequest, NextResponse } from 'next/server';
import {
  upsertInterviewSession,
  upsertInterviewChunks,
  upsertTranscriptDocument,
  fetchInterviewSession
} from '@/lib/weaviate/weaviate-session';

type TranscriptEntry = {
  speaker: string;
  text: string;
  timestamp: string;
  raw?: any;
};

declare global {
  // eslint-disable-next-line no-var
  var sessionsStore: Map<string, any> | undefined;
}

let sessions: Map<string, any>;
if (typeof global.sessionsStore === 'undefined') {
  global.sessionsStore = new Map<string, any>();
}
sessions = global.sessionsStore;

const BEYOND_PRESENCE_ENDPOINTS = [
  (callId: string) => `/v1/calls/${callId}/messages`
];

async function loadSession(sessionId: string) {
  const cached = sessions.get(sessionId);
  if (cached) {
    return cached;
  }

  try {
    const session = await fetchInterviewSession(sessionId);
    if (session) {
      sessions.set(sessionId, session);
      return session;
    }
  } catch (error) {
    console.warn('[BEY] Failed to load session from Weaviate:', error);
  }

  const fallback = {
    sessionId,
    sessionUrl: '',
    researchGoal: '',
    targetAudience: '',
    duration: 0,
    sensitivity: 'low',
    participantEmail: '',
    participantName: '',
    roomName: '',
    status: 'in_progress',
    startTime: new Date().toISOString(),
    endTime: undefined,
    durationMinutes: 0,
    script: null,
    transcript: [],
    summaries: [],
    psychometricProfile: null,
    keyFindings: [],
    beyondPresenceAgentId: '',
    beyondPresenceSessionId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    tags: [],
    isPublic: false,
    accessCode: ''
  };

  sessions.set(sessionId, fallback);
  return fallback;
}

export async function POST(request: NextRequest) {
  try {
    const { beySessionId, beyAgentId, sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    console.log('🔄 [BEY EXPORT] Received export request', {
      sessionId,
      beySessionId,
      beyAgentId
    });

    let session = await loadSession(sessionId);
    console.log('🔄 [BEY EXPORT] Loaded session metadata', {
      sessionId,
      status: session.status,
      hasTranscript: Array.isArray(session.transcript) && session.transcript.length > 0,
      storedAgentId: session.beyondPresenceAgentId || null,
      storedBeyondPresenceSessionId: session.beyondPresenceSessionId || null
    });

    const agentIdentifier = beyAgentId || session.beyondPresenceAgentId || null;
    const agentIdForResolution = agentIdentifier || beySessionId || null;

    const callResolution = await resolveBeyondPresenceCallId({
      providedSessionId: beySessionId,
      existingSessionId: session.beyondPresenceSessionId,
      providedAgentId: agentIdForResolution
    });

    let resolvedBeyondPresenceSessionId = callResolution.resolvedSessionId;
    const agentIdToPersist =
      agentIdentifier ||
      callResolution.candidateSessions.find((candidate) => candidate.agentId)?.agentId ||
      null;

    console.log('🔍 [BEY EXPORT] Call resolution result', {
      sessionId,
      resolvedBeyondPresenceSessionId,
      agentIdToPersist,
      candidateSessions: callResolution.candidateSessions.map((candidate) => ({
        id: candidate.id,
        status: candidate.status,
        startedAt: candidate.startedAt,
        endedAt: candidate.endedAt,
        lastActivityAt: candidate.lastActivityAt,
        sources: candidate.sources
      })),
      attempts: callResolution.attempts
    });

    if (!resolvedBeyondPresenceSessionId) {
      return NextResponse.json({
        success: false,
        message: 'Unable to resolve Beyond Presence call identifier',
        transcriptCount: 0,
        resolution: buildResolutionSummary(callResolution, resolvedBeyondPresenceSessionId)
      });
    }

    let transcript = await fetchTranscriptFromBeyondPresence(resolvedBeyondPresenceSessionId);

    console.log(
      `[BEY] Transcript export for session ${sessionId} yielded ${transcript.length} entries from Beyond Presence session ${resolvedBeyondPresenceSessionId}`
    );
    if (transcript.length > 0) {
      console.log('[BEY] Sample transcript entry:', transcript[0]);
    } else if (callResolution.candidateSessions.length > 1) {
      for (const candidate of callResolution.candidateSessions) {
        if (candidate.id === resolvedBeyondPresenceSessionId) {
          continue;
        }

        console.log('🔁 [BEY EXPORT] Attempting alternate call candidate for transcript retrieval', {
          sessionId,
          alternateSessionId: candidate.id,
          status: candidate.status,
          sources: candidate.sources
        });

        const alternateTranscript = await fetchTranscriptFromBeyondPresence(candidate.id);
        if (alternateTranscript.length > 0) {
          transcript = alternateTranscript;
          resolvedBeyondPresenceSessionId = candidate.id;
          console.log('✅ [BEY EXPORT] Found transcript via alternate call candidate', {
            sessionId,
            resolvedBeyondPresenceSessionId
          });
          break;
        }
      }
    }

    if (!transcript.length) {
      const fallbackTranscript = normalizeLocalTranscript(session.transcript);
      if (fallbackTranscript.length) {
        transcript = fallbackTranscript;
        console.warn('[BEY EXPORT] Using local session transcript as fallback', {
          sessionId,
          entryCount: transcript.length
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'No transcript messages returned from Beyond Presence',
          transcriptCount: 0,
          resolvedSessionId: resolvedBeyondPresenceSessionId,
          resolution: buildResolutionSummary(callResolution, resolvedBeyondPresenceSessionId)
        });
      }
    }

    const updatedSession = {
      ...session,
      transcript,
      beyondPresenceAgentId: agentIdToPersist || '',
      beyondPresenceSessionId: resolvedBeyondPresenceSessionId,
      status: 'completed',
      endTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    sessions.set(sessionId, updatedSession);
    console.log('📝 [BEY EXPORT] Updated in-memory session with transcript', {
      sessionId,
      entries: updatedSession.transcript.length,
      status: updatedSession.status,
      beyondPresenceAgentId: updatedSession.beyondPresenceAgentId,
      beyondPresenceSessionId: updatedSession.beyondPresenceSessionId
    });

    let weaviateSessionId: string | null = null;
    let transcriptDocumentId: string | null = null;
    let chunksStored = 0;
    let autoCompletionTriggered = false;
    let autoCompletionResponse: any = null;

    try {
      weaviateSessionId = await upsertInterviewSession(updatedSession);
      console.log('✅ [BEY EXPORT] Upserted InterviewSession in Weaviate', {
        weaviateSessionId,
        sessionId
      });

      if (weaviateSessionId) {
        transcriptDocumentId = await upsertTranscriptDocument(
          sessionId,
          weaviateSessionId,
          transcript
        );

        chunksStored = await upsertInterviewChunks(sessionId, weaviateSessionId, transcript);
        console.log('✅ [BEY EXPORT] Upserted transcript chunks', {
          sessionId,
          weaviateSessionId,
          chunksStored
        });
      }
    } catch (error) {
      console.error('⚠️ Failed to persist transcript to Weaviate:', error);
    }

    if (transcript.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      try {
        console.log('🧠 [BEY EXPORT] Triggering automatic session completion via /api/sessions/real-complete', {
          sessionId,
          transcriptEntries: transcript.length
        });
        const realCompleteResponse = await fetch(`${baseUrl}/api/sessions/real-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });

        if (realCompleteResponse.ok) {
          autoCompletionTriggered = true;
          autoCompletionResponse = await realCompleteResponse.json();
          console.log('✅ [BEY EXPORT] Automatic session completion succeeded', {
            sessionId
          });
        } else {
          const errorBody = await realCompleteResponse.text();
          console.error('❌ [BEY EXPORT] Automatic session completion failed', {
            sessionId,
            status: realCompleteResponse.status,
            errorBody
          });
        }
      } catch (completionError) {
        console.error('❌ [BEY EXPORT] Error triggering automatic session completion:', completionError);
      }

      if (!autoCompletionTriggered) {
        try {
          console.log('🧠 [BEY EXPORT] Fallback: calling /api/sessions/complete directly', {
            sessionId,
            transcriptEntries: transcript.length
          });
          const completionResponse = await fetch(`${baseUrl}/api/sessions/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              transcript,
              researchGoal: updatedSession.researchGoal
            })
          });

          if (completionResponse.ok) {
            autoCompletionTriggered = true;
            autoCompletionResponse = await completionResponse.json();
            console.log('✅ [BEY EXPORT] Session completion succeeded via fallback', {
              sessionId
            });
          } else {
            const errorBody = await completionResponse.text();
            console.error('❌ [BEY EXPORT] Fallback session completion failed', {
              sessionId,
              status: completionResponse.status,
              errorBody
            });
          }
        } catch (fallbackError) {
          console.error('❌ [BEY EXPORT] Error during fallback session completion:', fallbackError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      transcriptCount: transcript.length,
      transcriptDocumentId,
      chunksStored,
      weaviateSessionId,
      beyondPresenceSessionId: resolvedBeyondPresenceSessionId,
      resolution: buildResolutionSummary(callResolution, resolvedBeyondPresenceSessionId),
      session: updatedSession,
      autoCompletion: {
        triggered: autoCompletionTriggered,
        response: autoCompletionResponse
      }
    });
  } catch (error) {
    console.error('❌ Error exporting Beyond Presence transcript:', error);
    return NextResponse.json(
      { error: 'Failed to export transcript' },
      { status: 500 }
    );
  }
}

type BeyondPresenceSessionMeta = {
  id: string;
  agentId?: string;
  sessionId?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
  lastActivityAt?: string;
  sources: string[];
  rawKeys: string[];
};

type SessionResolutionAttempt = {
  endpoint: string;
  ok: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  sessionCount?: number;
  callCount?: number;
  extractedCount?: number;
  payloadKeys?: string[];
};

type SessionResolution = {
  resolvedSessionId: string | null;
  attempts: SessionResolutionAttempt[];
  candidateSessions: BeyondPresenceSessionMeta[];
};

const COMPLETED_SESSION_STATES = ['completed', 'ended', 'finished', 'done', 'stopped', 'closed'];

async function fetchTranscriptFromBeyondPresence(sessionId: string) {
  if (!process.env.BEY_API_KEY) {
    throw new Error('BEY_API_KEY must be set');
  }

  const baseUrl = process.env.BEY_API_URL || 'https://api.bey.dev';

  const MAX_ATTEMPTS = 4;
  const POLL_DELAY_MS = 1500;
  let collected: TranscriptEntry[] = [];
  const seenSignatures = new Set<string>();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.log('[BEY] Transcript fetch attempt', {
      sessionId,
      attempt,
      maxAttempts: MAX_ATTEMPTS,
      endpoints: BEYOND_PRESENCE_ENDPOINTS.length
    });

    for (const buildPath of BEYOND_PRESENCE_ENDPOINTS) {
      const path = buildPath(sessionId);

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          headers: {
            'x-api-key': process.env.BEY_API_KEY!,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          cache: 'no-store'
        });

        if (!response.ok) {
          console.warn('[BEY] Transcript endpoint returned non-OK', {
            sessionId,
            path,
            status: response.status,
            statusText: response.statusText,
            attempt
          });
          continue;
        }

        const payloadText = await response.text();
        if (!payloadText) {
          console.warn('[BEY] Transcript endpoint returned empty body', {
            sessionId,
            path,
            attempt
          });
          continue;
        }

        let payload: any;
        try {
          payload = JSON.parse(payloadText);
        } catch (parseError) {
          console.warn('[BEY] Transcript payload JSON parse failed', {
            sessionId,
            path,
            attempt,
            error: parseError instanceof Error ? parseError.message : String(parseError)
          });
          continue;
        }

        const keys = payload ? Object.keys(payload) : [];
        console.log('[BEY] Raw transcript payload received', {
          sessionId,
          path,
          keys,
          attempt,
          hasMessages: Boolean(payload?.messages && payload.messages.length)
        });
        const messages = extractMessages(payload);

        if (!messages.length) {
          continue;
        }

        console.log(`[BEY] Retrieved ${messages.length} raw messages from ${path}`);
        const normalized = normalizeMessages(messages);
        normalized.forEach((entry) => {
          const signature = `${entry.timestamp}:${entry.speaker}:${entry.text}`;
          if (!seenSignatures.has(signature)) {
            seenSignatures.add(signature);
            collected.push(entry);
          }
        });
      } catch (error) {
        console.warn(`[BEY] Transcript fetch failed for ${path}:`, error);
      }
    }

    if (collected.length > 0) {
      console.log('[BEY] Collected transcript entries after attempts', {
        sessionId,
        attempt,
        entries: collected.length
      });
      break;
    }

    if (attempt < MAX_ATTEMPTS) {
      await delay(POLL_DELAY_MS);
    }
  }

  return collected.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

async function resolveBeyondPresenceCallId({
  providedSessionId,
  existingSessionId,
  providedAgentId
}: {
  providedSessionId?: string | null;
  existingSessionId?: string | null;
  providedAgentId?: string | null;
}): Promise<SessionResolution> {
  const attempts: SessionResolutionAttempt[] = [];
  const candidateMap = new Map<string, BeyondPresenceSessionMeta>();
  const agentId = providedAgentId || undefined;

  const upsertCandidate = (candidate: BeyondPresenceSessionMeta) => {
    const existing = candidateMap.get(candidate.id);
    if (existing) {
      candidateMap.set(candidate.id, mergeSessionMeta(existing, candidate));
    } else {
      candidateMap.set(candidate.id, candidate);
    }
  };

  const candidateCallIds = [providedSessionId, existingSessionId].filter(
    (value): value is string => Boolean(value)
  );
  const candidateSessionIds = [providedSessionId, existingSessionId].filter(
    (value): value is string => Boolean(value)
  );

  if (agentId || candidateCallIds.length || candidateSessionIds.length) {
    try {
      const { calls, attempts: fetchAttempts } = await fetchCallsFromBeyondPresence({
        agentId,
        candidateCallIds,
        candidateSessionIds
      });
      calls.forEach(upsertCandidate);
      attempts.push(...fetchAttempts);
    } catch (error) {
      attempts.push({
        endpoint: 'calls-resolution',
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (providedSessionId) {
    upsertCandidate({
      id: providedSessionId,
      agentId,
      sessionId: providedSessionId,
      sources: ['input:provided'],
      rawKeys: [],
      status: undefined,
      startedAt: undefined,
      endedAt: undefined,
      lastActivityAt: undefined
    });
  }

  if (existingSessionId && existingSessionId !== providedSessionId) {
    upsertCandidate({
      id: existingSessionId,
      agentId,
      sessionId: existingSessionId,
      sources: ['input:existing'],
      rawKeys: [],
      status: undefined,
      startedAt: undefined,
      endedAt: undefined,
      lastActivityAt: undefined
    });
  }

  const candidateSessions = Array.from(candidateMap.values()).sort(
    (a, b) => computeSessionSortValue(b) - computeSessionSortValue(a)
  );

  const providedIdentifiers = [providedSessionId, existingSessionId].filter(
    (value): value is string => Boolean(value)
  );

  let resolvedSessionId: string | null = null;

  for (const target of providedIdentifiers) {
    const byId = candidateSessions.find((candidate) => candidate.id === target);
    if (byId) {
      resolvedSessionId = byId.id;
      break;
    }

    const bySession = candidateSessions.find(
      (candidate) => candidate.sessionId && candidate.sessionId === target
    );
    if (bySession) {
      resolvedSessionId = bySession.id;
      break;
    }
  }

  if (!resolvedSessionId) {
    const completed = candidateSessions.find((candidate) =>
      candidate.status
        ? COMPLETED_SESSION_STATES.includes(candidate.status.toLowerCase())
        : false
    );
    if (completed) {
      resolvedSessionId = completed.id;
    }
  }

  if (!resolvedSessionId && candidateSessions.length) {
    resolvedSessionId = candidateSessions[0].id;
  }

  return {
    resolvedSessionId,
    attempts,
    candidateSessions
  };
}

async function fetchCallsFromBeyondPresence({
  agentId,
  candidateCallIds = [],
  candidateSessionIds = []
}: {
  agentId?: string;
  candidateCallIds?: string[];
  candidateSessionIds?: string[];
}) {
  if (!process.env.BEY_API_KEY) {
    throw new Error('BEY_API_KEY must be set');
  }

  const baseUrl = process.env.BEY_API_URL || 'https://api.bey.dev';
  const attempts: SessionResolutionAttempt[] = [];
  const callMap = new Map<string, BeyondPresenceSessionMeta>();
  const endpoints = new Set<string>();

  candidateCallIds
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
    .forEach((callId) => {
      endpoints.add(`/v1/calls/${callId}`);
      endpoints.add(`/v1/calls?call_id=${callId}`);
      endpoints.add(`/v1/calls?callId=${callId}`);
    });

  candidateSessionIds
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
    .forEach((sessionId) => {
      endpoints.add(`/v1/calls?session_id=${sessionId}`);
      endpoints.add(`/v1/calls?sessionId=${sessionId}`);
    });

  if (agentId) {
    endpoints.add(`/v1/calls?agent_id=${agentId}`);
    endpoints.add(`/v1/calls?agentId=${agentId}`);
  }

  endpoints.add('/v1/calls');

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          'x-api-key': process.env.BEY_API_KEY!,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        attempts.push({
          endpoint,
          ok: false,
          status: response.status,
          statusText: response.statusText
        });
        continue;
      }

      const rawText = await response.text();
      let payload: any;
      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch (parseError) {
          attempts.push({
            endpoint,
            ok: false,
            status: response.status,
            statusText: 'Invalid JSON response',
            error: parseError instanceof Error ? parseError.message : String(parseError)
          });
          continue;
        }
      }

      const extracted = extractCallsFromPayload(payload, endpoint);
      const filtered = agentId
        ? extracted.filter((call) => !call.agentId || call.agentId === agentId)
        : extracted;

      filtered.forEach((call) => {
        const existing = callMap.get(call.id);
        callMap.set(call.id, existing ? mergeSessionMeta(existing, call) : call);
      });

      if (filtered.length > 0) {
        console.log('📦 [BEY] Candidate calls discovered', {
          endpoint,
          count: filtered.length,
          sample: filtered.slice(0, 3).map((call) => ({
            id: call.id,
            sessionId: call.sessionId,
            status: call.status,
            startedAt: call.startedAt,
            endedAt: call.endedAt,
            lastActivityAt: call.lastActivityAt,
            agentId: call.agentId,
            sources: call.sources
          }))
        });
      } else {
        console.log('ℹ️ [BEY] No candidate calls matched from endpoint', {
          endpoint,
          extractedCount: extracted.length,
          payloadKeys:
            payload && typeof payload === 'object' && !Array.isArray(payload)
              ? Object.keys(payload).slice(0, 12)
              : undefined
        });
      }

      attempts.push({
        endpoint,
        ok: true,
        status: response.status,
        sessionCount: filtered.length,
        callCount: filtered.length,
        extractedCount: extracted.length,
        payloadKeys:
          payload && typeof payload === 'object' && !Array.isArray(payload)
            ? Object.keys(payload).slice(0, 12)
            : undefined
      });
    } catch (error) {
      attempts.push({
        endpoint,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    calls: Array.from(callMap.values()),
    attempts
  };
}

function extractCallsFromPayload(payload: any, source: string): BeyondPresenceSessionMeta[] {
  if (!payload) {
    return [];
  }

  const candidates: any[] = [];

  const pushCandidate = (value: any) => {
    if (value !== undefined && value !== null) {
      candidates.push(value);
    }
  };

  if (Array.isArray(payload)) {
    payload.forEach(pushCandidate);
  } else if (typeof payload === 'object') {
    if (Array.isArray(payload.sessions)) {
      payload.sessions.forEach(pushCandidate);
    }
    if (payload.sessions && Array.isArray(payload.sessions.data)) {
      payload.sessions.data.forEach(pushCandidate);
    }
    if (payload.sessions && Array.isArray(payload.sessions.items)) {
      payload.sessions.items.forEach(pushCandidate);
    }
    if (Array.isArray(payload.calls)) {
      payload.calls.forEach(pushCandidate);
    }
    if (payload.calls && Array.isArray(payload.calls.data)) {
      payload.calls.data.forEach(pushCandidate);
    }
    if (payload.calls && Array.isArray(payload.calls.items)) {
      payload.calls.items.forEach(pushCandidate);
    }
    if (Array.isArray(payload.conversations)) {
      payload.conversations.forEach(pushCandidate);
    }
    if (payload.conversations && Array.isArray(payload.conversations.data)) {
      payload.conversations.data.forEach(pushCandidate);
    }
    if (payload.conversations && Array.isArray(payload.conversations.items)) {
      payload.conversations.items.forEach(pushCandidate);
    }
    if (Array.isArray(payload.chat)) {
      payload.chat.forEach(pushCandidate);
    }
    if (payload.chat && Array.isArray(payload.chat.data)) {
      payload.chat.data.forEach(pushCandidate);
    }
    if (payload.chat && Array.isArray(payload.chat.items)) {
      payload.chat.items.forEach(pushCandidate);
    }
    if (Array.isArray(payload.data)) {
      payload.data.forEach(pushCandidate);
    }
    if (Array.isArray(payload.results)) {
      payload.results.forEach(pushCandidate);
    }
    if (Array.isArray(payload.items)) {
      payload.items.forEach(pushCandidate);
    }
    if (payload.call) {
      pushCandidate(payload.call);
    }
    if (payload.session) {
      pushCandidate(payload.session);
    }
    if (payload.active_session) {
      pushCandidate(payload.active_session);
    }
    if (payload.latest_call) {
      pushCandidate(payload.latest_call);
    }
    if (payload.latest_session) {
      pushCandidate(payload.latest_session);
    }
    if (payload.agent?.active_session) {
      pushCandidate(payload.agent.active_session);
    }
    if (payload.agent?.active_conversation) {
      pushCandidate(payload.agent.active_conversation);
    }
    if (Array.isArray(payload.agent?.calls)) {
      payload.agent.calls.forEach(pushCandidate);
    }
    if (Array.isArray(payload.agent?.sessions)) {
      payload.agent.sessions.forEach(pushCandidate);
    }
    if (Array.isArray(payload.agent?.conversations)) {
      payload.agent.conversations.forEach(pushCandidate);
    }
    if (Array.isArray(payload.agent?.chat)) {
      payload.agent.chat.forEach(pushCandidate);
    }
    if (payload.agent?.latest_call) {
      pushCandidate(payload.agent.latest_call);
    }
    if (payload.agent?.latest_session) {
      pushCandidate(payload.agent.latest_session);
    }
    if (payload.agent?.latest_conversation) {
      pushCandidate(payload.agent.latest_conversation);
    }
    if (
      payload.session_id ||
      payload.sessionId ||
      payload.call_id ||
      payload.callId ||
      payload.conversation_id ||
      payload.conversationId ||
      payload.id
    ) {
      pushCandidate(payload);
    }
  } else if (typeof payload === 'string') {
    pushCandidate(payload);
  }

  return candidates
    .map((candidate) => normalizeSessionCandidate(candidate, source))
    .filter((candidate): candidate is BeyondPresenceSessionMeta => Boolean(candidate));
}

function normalizeSessionCandidate(
  candidate: any,
  source: string
): BeyondPresenceSessionMeta | null {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (!trimmed) {
      return null;
    }

    return {
      id: trimmed,
      sources: [source],
      rawKeys: []
    };
  }

  if (typeof candidate !== 'object') {
    return null;
  }

  const id =
    candidate.id ||
    candidate.call_id ||
    candidate.callId ||
    candidate.call?.id ||
    candidate.call?.uuid ||
    candidate.data?.id ||
    candidate.data?.call_id ||
    candidate.data?.callId ||
    candidate.conversation_id ||
    candidate.conversationId ||
    candidate.conversation_uuid ||
    candidate.conversationUUID ||
    candidate.chat_id ||
    candidate.chatId ||
    candidate.uuid;

  const sessionIdValue =
    candidate.session_id ||
    candidate.sessionId ||
    candidate.session_uuid ||
    candidate.sessionUuid ||
    candidate.session?.id ||
    candidate.session?.uuid ||
    candidate.data?.session_id ||
    candidate.data?.session_uuid ||
    candidate.call_session_id ||
    candidate.callSessionId ||
    candidate.call?.session_id ||
    candidate.call?.sessionId ||
    candidate.metadata?.session_id ||
    candidate.metadata?.sessionId;

  if (!id) {
    return null;
  }

  const agentId =
    candidate.agent_id ||
    candidate.agentId ||
    candidate.agent_id ||
    candidate.agent?.id ||
    candidate.agent?.uuid ||
    candidate.data?.agent_id ||
    candidate.data?.agentId ||
    candidate.agent?.agent_id;

  const status =
    candidate.status ||
    candidate.state ||
    candidate.session_status ||
    candidate.lifecycle_status ||
    candidate.conversation_status;

  const startedAt = normalizeDate(
    candidate.started_at ||
      candidate.startedAt ||
      candidate.start_time ||
      candidate.startTime ||
      candidate.created_at ||
      candidate.createdAt ||
      candidate.opened_at ||
      candidate.openedAt ||
      candidate.conversation_started_at ||
      candidate.chat_started_at
  );

  const endedAt = normalizeDate(
    candidate.ended_at ||
      candidate.endedAt ||
      candidate.end_time ||
      candidate.endTime ||
      candidate.completed_at ||
      candidate.completedAt ||
      candidate.closed_at ||
      candidate.closedAt ||
      candidate.finished_at ||
      candidate.finishedAt ||
      candidate.conversation_closed_at
  );

  const lastActivityAt = normalizeDate(
    candidate.updated_at ||
      candidate.updatedAt ||
      candidate.last_message_at ||
      candidate.lastMessageAt ||
      candidate.last_activity_at ||
      candidate.lastActivityAt ||
      candidate.conversation_updated_at
  );

  const rawKeys =
    typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
      ? Object.keys(candidate)
      : [];

  return {
    id: String(id),
    agentId: agentId ? String(agentId) : undefined,
    sessionId: sessionIdValue ? String(sessionIdValue) : undefined,
    status: status ? String(status) : undefined,
    startedAt,
    endedAt,
    lastActivityAt,
    sources: [source],
    rawKeys
  };
}

function normalizeDate(value: any) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function mergeSessionMeta(
  a: BeyondPresenceSessionMeta,
  b: BeyondPresenceSessionMeta
): BeyondPresenceSessionMeta {
  return {
    id: a.id,
    agentId: b.agentId || a.agentId,
    sessionId: b.sessionId || a.sessionId,
    status: b.status || a.status,
    startedAt: b.startedAt || a.startedAt,
    endedAt: b.endedAt || a.endedAt,
    lastActivityAt: b.lastActivityAt || a.lastActivityAt,
    sources: Array.from(new Set([...a.sources, ...b.sources])),
    rawKeys: Array.from(new Set([...a.rawKeys, ...b.rawKeys]))
  };
}

function computeSessionSortValue(session: BeyondPresenceSessionMeta) {
  const timestamps = [
    session.endedAt,
    session.lastActivityAt,
    session.startedAt
  ]
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => Number.isFinite(value));

  return timestamps.length ? Math.max(...timestamps) : 0;
}

function buildResolutionSummary(
  resolution: SessionResolution,
  resolvedSessionIdOverride?: string | null
) {
  return {
    resolvedSessionId: resolvedSessionIdOverride ?? resolution.resolvedSessionId,
    candidateSessions: resolution.candidateSessions.map((candidate) => ({
      id: candidate.id,
      agentId: candidate.agentId,
      sessionId: candidate.sessionId,
      status: candidate.status,
      startedAt: candidate.startedAt,
      endedAt: candidate.endedAt,
      lastActivityAt: candidate.lastActivityAt,
      sources: candidate.sources
    })),
    attempts: resolution.attempts
  };
}

function extractMessages(payload: any) {
  if (!payload) return [];

  // BEY API returns array directly from /v1/calls/{id}/messages
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.messages)) {
    return payload.messages;
  }

  if (Array.isArray(payload.events)) {
    return payload.events;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.conversations)) {
    return payload.conversations;
  }

  if (payload.conversation && Array.isArray(payload.conversation.messages)) {
    return payload.conversation.messages;
  }

  if (Array.isArray(payload.chat)) {
    return payload.chat;
  }

  if (payload.messages) {
    if (Array.isArray(payload.messages)) {
      return payload.messages;
    }
    if (Array.isArray(payload.messages?.data)) {
      return payload.messages.data;
    }
  }

  if (payload.message) {
    return [payload.message];
  }

  if (payload.conversation) {
    return [payload.conversation];
  }

  return [];
}

function normalizeMessages(messages: any[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  let skippedWithoutText = 0;
  let skippedWithoutTimestamp = 0;

  for (const message of messages) {
    const text = extractText(message);

    if (!text.trim()) {
      skippedWithoutText += 1;
      continue;
    }

    const speaker = determineSpeaker(message);
    const timestamp = normalizeTimestamp(
      message.sent_at ||
        message.timestamp ||
        message.created_at ||
        message.message?.timestamp ||
        message.data?.timestamp
    );

    if (!timestamp) {
      skippedWithoutTimestamp += 1;
      continue;
    }

    entries.push({
      speaker,
      text,
      timestamp,
      raw: message
    });
  }

  if (skippedWithoutText > 0) {
    console.warn(
      `[BEY] Skipped ${skippedWithoutText} messages without textual content`
    );
  }

  if (skippedWithoutTimestamp > 0) {
    console.warn(
      `[BEY] Skipped ${skippedWithoutTimestamp} messages without timestamps`
    );
  }

  if (entries.length === 0) {
    console.warn('[BEY] No transcript entries extracted after normalization', {
      originalMessages: messages.length
    });
  }

  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function determineSpeaker(message: any): string {
  // BEY API uses 'sender' field with values 'ai' or 'user'
  if (message.sender) {
    return message.sender === 'ai' ? 'agent' : 'participant';
  }

  const candidates = [
    message.speaker,
    message.role,
    message.author,
    message.author?.role,
    message.sender?.type,
    message.sender_type,
    message.metadata?.speaker,
    message.message?.role,
    message.message?.author,
    message.message?.author?.role,
    message.message?.sender_type,
    message.data?.role,
    message.data?.speaker
  ];

  const explicit = candidates.find(Boolean);

  if (explicit) {
    return normalizeSpeakerLabel(explicit);
  }

  if (message.type === 'agent_message' || message.type === 'assistant') {
    return 'agent';
  }

  if (message.type === 'user_message' || message.type === 'participant') {
    return 'participant';
  }

  return 'unknown';
}

function normalizeSpeakerLabel(label: string) {
  const value = label.toLowerCase();
  if (value.includes('agent') || value.includes('assistant') || value.includes('ai')) {
    return 'agent';
  }
  if (value.includes('user') || value.includes('participant') || value.includes('human')) {
    return 'participant';
  }
  return label;
}

function normalizeTimestamp(input?: string) {
  if (!input) {
    return new Date().toISOString();
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractText(message: any): string {
  const visited = new WeakSet();
  const toText = (value: any, depth: number = 0): string | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      if (depth > 4) {
        return undefined;
      }
      const parts = value
        .map((item) => toText(item, depth + 1))
        .filter((part): part is string => Boolean(part));
      const combined = parts.join(' ').trim();
      return combined || undefined;
    }

    if (typeof value === 'object') {
      if (visited.has(value) || depth > 4) {
        return undefined;
      }
      visited.add(value);

      const priorityKeys = [
        'message',
        'text',
        'content',
        'value',
        'body',
        'data',
        'payload',
        'transcript',
        'response',
        'parts',
        'delta'
      ];

      for (const key of priorityKeys) {
        if (key in value) {
          const result = toText((value as any)[key], depth + 1);
          if (result) {
            return result;
          }
        }
      }
    }

    return undefined;
  };

  const candidates = [
    message.message,
    message.text,
    message,
    message.content,
    message.body,
    message.data,
    message.payload,
    message.event,
    message.delta
  ];

  for (const candidate of candidates) {
    const result = toText(candidate);
    if (result) {
      return result;
    }
  }

  return '';
}

function normalizeLocalTranscript(transcript: any): TranscriptEntry[] {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return [];
  }

  const validEntries: TranscriptEntry[] = [];
  
  for (let i = 0; i < transcript.length; i++) {
    const entry = transcript[i];
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const text = typeof entry.text === 'string' ? entry.text.trim() : '';
    if (!text) {
      continue;
    }
    const speaker = entry.speaker ? String(entry.speaker) : 'unknown';
    const timestampCandidate =
      entry.timestamp ||
      entry.time ||
      entry.createdAt ||
      entry.updatedAt ||
      new Date(Date.now() + i).toISOString();

    const timestamp = normalizeTimestamp(timestampCandidate);
    validEntries.push({
      speaker: normalizeSpeakerLabel(speaker),
      text,
      timestamp,
      raw: entry
    });
  }
  
  return validEntries;
}
