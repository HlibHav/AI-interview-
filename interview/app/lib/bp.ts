// lib/bp.ts
export type BPSession = {
  sessionId: string;
  avatarId: string;
  transportType?: 'livekit' | 'webrtc' | string;
  livekitUrl?: string;
  roomName?: string;
  status?: string;
  startedAt?: string;
  interviewId?: string; // Add interviewId for debugging
  agentIdentity?: string; // Add agentIdentity for debugging
};

let inflightSession: Promise<BPSession> | null = null;

/** Create or reuse a BP session for this interview.
 *  Use interviewId (or roomId) as idempotency key to prevent duplicates.
 */
export async function createOrGetBPSession(interviewId: string, agentId: string, participantEmail: string): Promise<BPSession> {
  if (inflightSession) return inflightSession;

  inflightSession = (async () => {
    // No agentId needed - BP creates agent automatically
    const res = await fetch(`/api/beyond-presence/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId, participantEmail }), // Remove agentId
    });
    if (!res.ok) throw new Error(`BP session create failed: ${res.status}`);
    const s: BPSession = await res.json();
    return s;
  })().finally(() => { inflightSession = null; });

  return inflightSession;
}

/** Poll the authoritative session endpoint until LiveKit is truly ready. */
export async function waitForBPLiveKitReady(sessionId: string, timeoutMs = 20000, intervalMs = 500): Promise<BPSession> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const res = await fetch(`/api/beyond-presence/session-status/${sessionId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`BP session fetch failed: ${res.status}`);
    const s: BPSession = await res.json();
    
    console.log(`🔍 BP session status check (${Date.now() - t0}ms):`, {
      status: s.status,
      hasLivekitUrl: !!s.livekitUrl,
      transportType: s.transportType
    });
    
    // Wait for active status AND livekit_url
    if (s.status === 'active' && s.livekitUrl && s.transportType === 'livekit') {
      return s; // Return the session as-is, preserving the correct roomName
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`BP session never became active within ${timeoutMs}ms`);
}

/** Optionally tell backend to destroy/stop the BP session. */
export async function destroyBPSession(sessionId: string) {
  try { await fetch(`/api/beyond-presence/cleanup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }); } catch {}
}
