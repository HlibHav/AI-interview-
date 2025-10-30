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

export async function POST(request: NextRequest) {
  if (!validateSecret(request)) {
    console.warn('⚠️ [BEY WEBHOOK] Secret validation failed');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: AnyRecord;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('❌ [BEY WEBHOOK] Failed to parse JSON payload', error);
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
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
      ['data', 'call_id']
    ]) || null;

  const beyAgentId =
    coalesceString(payload, [
      ['agentId'],
      ['agent_id'],
      ['call', 'agentId'],
      ['call', 'agent_id'],
      ['data', 'agentId'],
      ['data', 'agent_id']
    ]) || null;

  if (!sessionId && !beySessionId) {
    console.warn('⚠️ [BEY WEBHOOK] Missing session identifiers', {
      keys: Object.keys(payload || {})
    });
    return NextResponse.json(
      { success: false, error: 'Missing session identifier' },
      { status: 400 }
    );
  }

  const messages = toTranscriptEntries(extractMessages(payload));

  if (messages.length === 0) {
    console.log('ℹ️ [BEY WEBHOOK] No textual messages in payload', {
      sessionId,
      beySessionId
    });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  try {
    const response = await fetch(`${baseUrl}/api/sessions/update-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        beySessionId,
        transcript: messages,
        beyondPresenceAgentId: beyAgentId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BEY WEBHOOK] Failed to forward transcript payload', {
        sessionId,
        beySessionId,
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return NextResponse.json(
        { success: false, error: 'Failed to persist transcript' },
        { status: 500 }
      );
    }

    console.log('✅ [BEY WEBHOOK] Forwarded messages to transcript updater', {
      sessionId,
      beySessionId,
      messages: messages.length
    });
  } catch (error) {
    console.error('❌ [BEY WEBHOOK] Error forwarding transcript payload', error);
    return NextResponse.json(
      { success: false, error: 'Failed to persist transcript' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    sessionId,
    beySessionId,
    messages: messages.length
  });
}
