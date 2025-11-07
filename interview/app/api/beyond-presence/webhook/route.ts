import { NextRequest, NextResponse } from 'next/server';

type AnyRecord = Record<string, any>;

function coalesceString(source: AnyRecord | undefined, paths: string[][]): string | null {
  if (!source) {
    return null;
  }

  for (const path of paths) {
    let current: any = source;
    let matched = true;

    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        matched = false;
        break;
      }
    }

    if (matched && typeof current === 'string' && current.trim().length > 0) {
      return current.trim();
    }
  }

  return null;
}

function extractMessages(payload: AnyRecord): AnyRecord[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const candidates: AnyRecord[] = [];

  if (Array.isArray(payload.messages)) {
    candidates.push(...payload.messages);
  }

  if (payload.message && typeof payload.message === 'object') {
    candidates.push(payload.message);
  }

  if (payload.data) {
    if (Array.isArray(payload.data.messages)) {
      candidates.push(...payload.data.messages);
    }

    if (payload.data.message && typeof payload.data.message === 'object') {
      candidates.push(payload.data.message);
    }
  }

  return candidates;
}

function toTranscriptEntries(messages: AnyRecord[]) {
  return messages
    .map((msg) => {
      const text =
        typeof msg?.text === 'string'
          ? msg.text
          : typeof msg?.message === 'string'
            ? msg.message
            : typeof msg?.content === 'string'
              ? msg.content
              : null;

      if (!text || text.trim().length === 0) {
        return null;
      }

      const sender =
        typeof msg?.sender === 'string'
          ? msg.sender
          : typeof msg?.role === 'string'
            ? msg.role
            : typeof msg?.kind === 'string'
              ? msg.kind
              : null;

      const speaker =
        sender && ['ai', 'assistant', 'agent', 'system', 'bot'].includes(sender.toLowerCase())
          ? 'agent'
          : 'participant';

      const timestamp =
        msg?.sent_at ||
        msg?.timestamp ||
        msg?.created_at ||
        msg?.createdAt ||
        msg?.time ||
        new Date().toISOString();

      return {
        speaker,
        text: text.trim(),
        timestamp: typeof timestamp === 'string' ? timestamp : new Date().toISOString(),
        raw: msg
      };
    })
    .filter(Boolean);
}

function validateSecret(request: NextRequest) {
  const configured = process.env.BEY_WEBHOOK_SECRET;
  if (!configured) {
    return true;
  }

  const headerSecret =
    request.headers.get('x-bey-signature') ||
    request.headers.get('x-bey-secret') ||
    request.headers.get('x-webhook-secret');

  if (headerSecret && headerSecret === configured) {
    return true;
  }

  const urlSecret = request.nextUrl.searchParams.get('secret');
  return urlSecret !== null && urlSecret === configured;
}

// GET handler for webhook URL validation (used by BEY SDK to verify endpoint)
export async function GET(request: NextRequest) {
  console.log('✅ [BEY WEBHOOK] Webhook endpoint validation request received', {
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer')
  });
  
  return NextResponse.json(
    {
      success: true,
      message: 'Webhook endpoint is ready',
      endpoint: '/api/beyond-presence/webhook'
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-bey-signature, x-bey-secret, x-webhook-secret',
      }
    }
  );
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-bey-signature, x-bey-secret, x-webhook-secret',
    }
  });
}

export async function POST(request: NextRequest) {
  console.log('📥 [BEY WEBHOOK] POST request received', {
    method: request.method,
    url: request.url,
    contentType: request.headers.get('content-type'),
    hasBody: request.body !== null
  });

  if (!validateSecret(request)) {
    console.warn('⚠️ [BEY WEBHOOK] Secret validation failed');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  let payload: AnyRecord;
  try {
    payload = await request.json();
    console.log('✅ [BEY WEBHOOK] Parsed payload:', {
      keys: Object.keys(payload || {}),
      hasCallId: Boolean(payload?.callId || payload?.call_id),
      hasAgentId: Boolean(payload?.agentId || payload?.agent_id),
      hasMessages: Boolean(payload?.messages || payload?.message),
      payloadPreview: JSON.stringify(payload).substring(0, 500)
    });
  } catch (error) {
    console.error('❌ [BEY WEBHOOK] Failed to parse JSON payload', error);
    return NextResponse.json(
      { success: false, error: 'Invalid JSON' },
      { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  const sessionId =
    coalesceString(payload, [
      ['sessionId'],
      ['session_id'],
      ['session'],
      ['data', 'sessionId'],
      ['data', 'session_id'],
      ['call', 'sessionId'],
      ['call', 'session_id'],
      ['metadata', 'sessionId'],
      ['metadata', 'session_id']
    ]) || null;

  const beySessionId =
    coalesceString(payload, [
      ['callId'],
      ['call_id'],
      ['call', 'id'],
      ['data', 'callId'],
      ['data', 'call_id'],
      ['call_data', 'callId'],
      ['call_data', 'call_id'],
      ['call_data', 'id']
    ]) || null;

  const beyAgentId =
    coalesceString(payload, [
      ['agentId'],
      ['agent_id'],
      ['call', 'agentId'],
      ['call', 'agent_id'],
      ['data', 'agentId'],
      ['data', 'agent_id'],
      ['call_data', 'agentId'],
      ['call_data', 'agent_id']
    ]) || null;

  const eventNameRaw =
    coalesceString(payload, [
      ['event'],
      ['event_type'],
      ['type'],
      ['data', 'event'],
      ['data', 'type'],
      ['call', 'event'],
      ['call', 'type'],
      ['call_data', 'event'],
      ['call_data', 'event_type']
    ]) || '';

  const callStatusRaw =
    coalesceString(payload, [
      ['status'],
      ['call', 'status'],
      ['data', 'status'],
      ['call_data', 'status']
    ]) || '';

  const callStateRaw =
    coalesceString(payload, [
      ['state'],
      ['call', 'state'],
      ['data', 'state'],
      ['call_data', 'state']
    ]) || '';

  const normalizedEvent = eventNameRaw.trim().toLowerCase();
  const normalizedStatus = callStatusRaw.trim().toLowerCase();
  const normalizedState = callStateRaw.trim().toLowerCase();

  // If sessionId is missing, try to find it by agentId or Beyond Presence sessionId
  let resolvedSessionId = sessionId;
  if (!resolvedSessionId && beyAgentId) {
    try {
      const { fetchInterviewSessionByAgentId } = await import('@/lib/weaviate/weaviate-session');
      const foundSession = await fetchInterviewSessionByAgentId(beyAgentId);
      if (foundSession) {
        resolvedSessionId = foundSession.sessionId;
        console.log('✅ [BEY WEBHOOK] Found session by agentId', {
          beyAgentId,
          resolvedSessionId
        });
      }
    } catch (error) {
      console.warn('⚠️ [BEY WEBHOOK] Failed to find session by agentId', {
        beyAgentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (!resolvedSessionId && beySessionId) {
    try {
      const { fetchInterviewSessionByBeyondPresenceSessionId } = await import('@/lib/weaviate/weaviate-session');
      const foundSession = await fetchInterviewSessionByBeyondPresenceSessionId(beySessionId);
      if (foundSession) {
        resolvedSessionId = foundSession.sessionId;
        console.log('✅ [BEY WEBHOOK] Found session by beySessionId', {
          beySessionId,
          resolvedSessionId
        });
      }
    } catch (error) {
      console.warn('⚠️ [BEY WEBHOOK] Failed to find session by beySessionId', {
        beySessionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (!resolvedSessionId && !beySessionId) {
    console.warn('⚠️ [BEY WEBHOOK] Missing session identifiers', {
      keys: Object.keys(payload || {}),
      beyAgentId,
      payload: JSON.stringify(payload).substring(0, 500)
    });
    // Для тестових запитів або подій без sessionId, повертаємо успішну відповідь
    // BEY SDK може надсилати події без sessionId (наприклад, call_ended)
    return NextResponse.json(
      { 
        success: true, 
        message: 'Webhook received but no session identifier found',
        received: true
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  const messages = toTranscriptEntries(extractMessages(payload));

  // Якщо немає повідомлень і немає sessionId, це може бути просто подія (наприклад, call_ended)
  if (messages.length === 0 && !resolvedSessionId) {
    console.log('ℹ️ [BEY WEBHOOK] Event without messages and sessionId, accepting webhook', {
      beySessionId,
      beyAgentId,
      payloadKeys: Object.keys(payload || {})
    });
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook event received',
        event: payload?.event || payload?.type || 'unknown',
        beySessionId,
        beyAgentId
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  if (messages.length > 0 && resolvedSessionId) {
    console.log('📤 [BEY WEBHOOK] Forwarding transcript payload', {
      sessionId: resolvedSessionId,
      beySessionId,
      messages: messages.length
    });

    void fetch(`${baseUrl}/api/sessions/update-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: resolvedSessionId,
        beySessionId,
        transcript: messages,
        beyondPresenceAgentId: beyAgentId
      })
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [BEY WEBHOOK] Failed to forward transcript payload', {
            sessionId: resolvedSessionId,
            beySessionId,
            status: response.status,
            statusText: response.statusText,
            errorText
          });
        } else {
          console.log('✅ [BEY WEBHOOK] Transcript payload accepted', {
            sessionId: resolvedSessionId,
            beySessionId,
            messages: messages.length
          });
        }
      })
      .catch((error) => {
        console.error('❌ [BEY WEBHOOK] Error forwarding transcript payload', error);
      });
  }

  const endedStatusTokens = ['ended', 'completed', 'finished', 'stopped', 'closed', 'terminated', 'disconnected', 'success'];
  const endedEvents = [
    'call.completed',
    'call_complete',
    'call.completed.success',
    'call_ended',
    'call.end',
    'call.finished',
    'call.ended',
    'conversation.completed',
    'conversation_ended'
  ];

  const eventMatches =
    endedEvents.includes(normalizedEvent) ||
    (normalizedEvent && endedEvents.some((needle) => normalizedEvent.includes(needle.replace(/[._]/g, '')))) ||
    (normalizedEvent && endedStatusTokens.some((token) => normalizedEvent.includes(token)));

  const statusMatches =
    endedStatusTokens.includes(normalizedStatus) ||
    endedStatusTokens.some((token) => normalizedStatus.includes(token));

  const stateMatches =
    endedStatusTokens.includes(normalizedState) ||
    endedStatusTokens.some((token) => normalizedState.includes(token));

  const messageMatches =
    Array.isArray(payload?.messages) &&
    payload.messages.some((msg: any) => {
      const msgType = typeof msg?.type === 'string' ? msg.type.toLowerCase() : '';
      const msgEvent = typeof msg?.event === 'string' ? msg.event.toLowerCase() : '';
      const msgStatus =
        typeof msg?.status === 'string' ? msg.status.toLowerCase() : '';
      return (
        endedStatusTokens.some((token) => msgType.includes(token)) ||
        endedStatusTokens.some((token) => msgEvent.includes(token)) ||
        endedStatusTokens.some((token) => msgStatus.includes(token))
      );
    });

  const callEnded =
    eventMatches ||
    statusMatches ||
    stateMatches ||
    messageMatches ||
    Boolean(payload?.call?.endedAt || payload?.call?.ended_at);

  if (callEnded && resolvedSessionId) {
    if (completedSessions.has(resolvedSessionId)) {
      console.log('ℹ️ [BEY WEBHOOK] Call end already processed, skipping duplicate', {
        sessionId: resolvedSessionId,
        beySessionId,
        event: normalizedEvent || null
      });
    } else {
      completedSessions.add(resolvedSessionId);
      console.log('🏁 [BEY WEBHOOK] Call ended event detected, scheduling completion', {
        sessionId: resolvedSessionId,
        beySessionId,
        event: normalizedEvent || null,
        status: normalizedStatus || null,
        state: normalizedState || null
      });

      void (async () => {
        try {
          const completionResponse = await fetch(`${baseUrl}/api/sessions/real-complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: resolvedSessionId
            })
          });

          if (!completionResponse.ok) {
            const errorText = await completionResponse.text();
            console.error('⚠️ [BEY WEBHOOK] Session completion request failed', {
              sessionId: resolvedSessionId,
              status: completionResponse.status,
              statusText: completionResponse.statusText,
              errorText
            });
            completedSessions.delete(resolvedSessionId);
          } else {
            console.log('✅ [BEY WEBHOOK] Session completion triggered successfully', {
              sessionId: resolvedSessionId
            });
          }
        } catch (error) {
          completedSessions.delete(resolvedSessionId);
          console.error('⚠️ [BEY WEBHOOK] Error triggering session completion', {
            sessionId: resolvedSessionId,
            error
          });
        }
      })();
    }
  }

  return NextResponse.json(
    {
      success: true,
      sessionId: resolvedSessionId,
      beySessionId,
      messages: messages.length,
      event: normalizedEvent || null,
      callStatus: normalizedStatus || null,
      callEnded: Boolean(callEnded)
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    }
  );
}
declare global {
  // eslint-disable-next-line no-var
  var beyCompletedSessions: Set<string> | undefined;
}

const completedSessions =
  globalThis.beyCompletedSessions ?? (globalThis.beyCompletedSessions = new Set<string>());
