import { NextRequest } from "next/server";
import { fetchInterviewSession } from "@/lib/weaviate/weaviate-session";

declare global {
  // eslint-disable-next-line no-var
  var sessionsStore: Map<string, any> | undefined;
}

let sessions: Map<string, any>;

if (typeof global.sessionsStore === "undefined") {
  global.sessionsStore = new Map<string, any>();
}
sessions = global.sessionsStore;
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  
  // Extract sessionId from query params
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!agentId) {
    return new Response("Session ID is required", { status: 400 });
  }

  console.log("Starting stream for agentId:", agentId);

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Set up SSE headers
      const headers = new Headers({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      let lastMessageCount = 0;
      let lastPersistedEmail: string | null = null;
      let resolvedCallId: string | null = null;
      let callEndedNotified = false;
      const encoder = new TextEncoder();
      let interval: ReturnType<typeof setInterval> | null = null;
      let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
      let idlePolls = 0;
      const MAX_IDLE_POLLS = 5;
      let cachedSession = sessionId ? sessions.get(sessionId) ?? null : null;
      let sessionFetchAttempted = false;
      let lastCallStatusCheck = 0;
      let lastCallResolveAttempt = 0;
      const CALL_STATUS_INTERVAL_MS = 10000; // Increased from 8s to 10s
      const CALL_RESOLVE_INTERVAL_MS = 30000; // Increased from 20s to 30s

      const baseUrl = process.env.BEY_API_URL || 'https://api.bey.dev';
      const apiHeaders = {
        'x-api-key': process.env.BEY_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      };
      const streamTranscriptsEnabled =
        (process.env.BEY_STREAM_TRANSCRIPTS || 'true').toLowerCase() !== 'false';

      if (!streamTranscriptsEnabled) {
        console.log('ℹ️ [STREAM] Transcript polling disabled via BEY_STREAM_TRANSCRIPTS=false', {
          agentId,
          sessionId
        });
      }

      const sendEvent = (payload: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (error) {
          console.warn('⚠️ [STREAM] Failed to enqueue SSE payload:', error);
        }
      };

      const extractParticipantEmail = (message: any): string | null => {
        if (!message || typeof message !== 'object') {
          return null;
        }
        const queue: Array<{ value: any; key?: string }> = Object.keys(message).map((key) => ({
          key,
          value: (message as any)[key],
        }));
        const visited = new Set<any>();

        while (queue.length > 0) {
          const { value, key } = queue.shift()!;
          if (visited.has(value)) {
            continue;
          }
          visited.add(value);

          if (typeof value === 'string') {
            const keyHint = key ? key.toLowerCase() : '';
            if (keyHint.includes('email') && value.includes('@')) {
              return value.trim().toLowerCase();
            }
            continue;
          }

          if (Array.isArray(value)) {
            value.forEach((entry) => queue.push({ value: entry }));
            continue;
          }

          if (value && typeof value === 'object') {
            for (const nestedKey of Object.keys(value)) {
              queue.push({ key: nestedKey, value: (value as any)[nestedKey] });
            }
          }
        }

        return null;
      };

      const persistParticipantEmail = async (email: string | null | undefined) => {
        if (!sessionId || !email) {
          return;
        }

        const normalized = email.trim().toLowerCase();
        if (!normalized || lastPersistedEmail === normalized) {
          return;
        }

        if (cachedSession?.participantEmail && cachedSession.participantEmail.toLowerCase() === normalized) {
          lastPersistedEmail = normalized;
          return;
        }

        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL ||
            `${request.nextUrl.protocol}//${request.nextUrl.host}`;

          const resp = await fetch(`${baseUrl}/api/sessions/update-transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              transcript: [],
              participantEmail: normalized
            })
          });

          if (resp.ok) {
            lastPersistedEmail = normalized;
            if (cachedSession) {
              cachedSession = { ...cachedSession, participantEmail: normalized };
              sessions.set(sessionId, cachedSession);
            }
          } else {
            console.warn('⚠️ [STREAM] Failed to persist participant email', {
              sessionId,
              status: resp.status
            });
          }
        } catch (error) {
          console.warn('⚠️ [STREAM] Error persisting participant email:', error);
        }
      };


      const endStream = (reason: string) => {
        if (callEndedNotified) {
          return;
        }
        callEndedNotified = true;
        console.log('ℹ️ [STREAM] Ending stream', { agentId, sessionId, reason });
        sendEvent({ type: 'call-ended', reason });
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        try {
          controller.close();
        } catch (error) {
          console.warn('⚠️ [STREAM] Failed to close controller gracefully:', error);
        }
      };

      const handleUnauthorizedResponse = async (response: Response, context: string) => {
        if (callEndedNotified) {
          return true;
        }
        if (response.status === 401 || response.status === 403) {
          let errorText: string | undefined;
          try {
            errorText = await response.text();
          } catch (error) {
            errorText = undefined;
          }
          console.error('❌ [STREAM] Beyond Presence unauthorized', {
            context,
            status: response.status,
            errorText,
            sessionId,
            agentId,
          });
          endStream('beyond_presence_forbidden');
          return true;
        }
        return false;
      };

      const sessionStatusIsComplete = (status: unknown) => {
        if (typeof status !== 'string') {
          return false;
        }
        const normalized = status.toLowerCase();
        return ['completed', 'complete', 'finished', 'ended', 'archived', 'stopped', 'closed'].includes(normalized);
      };

      const sessionHasTranscript = (session: any) => {
        if (!session) {
          return false;
        }

        if (Array.isArray(session.transcript) && session.transcript.length > 0) {
          return true;
        }

        if (typeof session.transcriptEntries === 'number' && session.transcriptEntries > 0) {
          return true;
        }

        if (typeof session?.metadata?.transcriptEntries === 'number' && session.metadata.transcriptEntries > 0) {
          return true;
        }

        if (session?.metadata?.hasTranscript === true) {
          return true;
        }

        return false;
      };

      const sessionRecordIsComplete = (session: any) => {
        if (!session) {
          return false;
        }

        const status =
          typeof session.status === 'string'
            ? session.status
            : typeof session?.metadata?.status === 'string'
              ? session.metadata.status
              : null;

        if (!sessionStatusIsComplete(status)) {
          return false;
        }

        if (!sessionHasTranscript(session)) {
          console.log('ℹ️ [STREAM] Session flagged complete but has no transcript, continuing stream', {
            sessionId: session.sessionId || sessionId
          });
          return false;
        }

        return true;
      };

      const hydrateSessionFromStore = async () => {
        if (!sessionId) {
          return null;
        }

        cachedSession = sessions.get(sessionId) ?? cachedSession;
        if (cachedSession) {
          return cachedSession;
        }

        if (sessionFetchAttempted) {
          return null;
        }
        sessionFetchAttempted = true;

        try {
          const fetched = await fetchInterviewSession(sessionId);
          if (fetched) {
            sessions.set(sessionId, fetched);
            cachedSession = fetched;
          }
        } catch (error) {
          console.warn('⚠️ [STREAM] Failed to hydrate session from persistence:', {
            sessionId,
            error
          });
        }

        return cachedSession;
      };

      const checkSessionCompletion = async (reason: string) => {
        if (!sessionId || callEndedNotified) {
          return false;
        }

        cachedSession = sessions.get(sessionId) ?? cachedSession;
        if (sessionRecordIsComplete(cachedSession)) {
          endStream(reason);
          return true;
        }

        const fetched = await hydrateSessionFromStore();
        if (sessionRecordIsComplete(fetched)) {
          endStream(reason);
          return true;
        }

        return false;
      };

      const fetchCallStatus = async (callId: string, opts?: { force?: boolean }) => {
        const now = Date.now();
        if (!opts?.force && now - lastCallStatusCheck < CALL_STATUS_INTERVAL_MS) {
          return null;
        }
        lastCallStatusCheck = now;

        try {
          // Import rate limiter
          const { beyApiRateLimiter, delay } = await import('@/lib/utils/rate-limiter');
          
          // Rate limit: wait if needed before making request
          await beyApiRateLimiter.waitUntilAllowed(`call-status-${callId}`, 3000);
          await delay(100); // Small delay

          const response = await fetch(`${baseUrl}/v1/calls/${callId}`, {
            headers: apiHeaders,
            cache: 'no-store'
          });

          if (await handleUnauthorizedResponse(response, 'call_status')) {
            return null;
          }

          if (response.status === 404 || response.status === 410) {
            endStream('call_status_not_found');
            return null;
          }

          if (!response.ok) {
            return null;
          }

          const payload = await response.json();
          const callEmail = extractParticipantEmail(payload);
          await persistParticipantEmail(callEmail);
          const status =
            payload?.status ||
            payload?.call?.status ||
            payload?.data?.status ||
            null;

          const endedAt =
            payload?.endedAt ||
            payload?.ended_at ||
            payload?.call?.endedAt ||
            payload?.call?.ended_at ||
            null;

          if (status && typeof status === 'string') {
            const normalized = status.toLowerCase();
            if (['ended', 'completed', 'finished', 'stopped', 'closed'].includes(normalized)) {
              endStream(`call_status_${normalized}`);
              return normalized;
            }
          }

          if (endedAt) {
            endStream('call_status_ended_at');
            return 'ended';
          }

          return status;
        } catch (error) {
          console.warn('⚠️ [STREAM] Failed to fetch call status:', error);
          return null;
        }
      };

      const resolveCallId = async () => {
        const now = Date.now();
        if (now - lastCallResolveAttempt < CALL_RESOLVE_INTERVAL_MS) {
          return;
        }
        lastCallResolveAttempt = now;

        // NOTE: BEY API does not support ?agentId= or ?agent_id= query parameters
        // Removed to prevent invalid API calls
        // Instead, we rely on callId resolution from messages endpoint or webhook
        
        const candidates: string[] = [];
        // Only use endpoints that don't require agentId query parameter
        const endpoints: string[] = [];

        // Import rate limiter
        const { beyApiRateLimiter, delay } = await import('@/lib/utils/rate-limiter');

        for (const endpoint of endpoints) {
          try {
            // Rate limit: wait if needed before making request
            await beyApiRateLimiter.waitUntilAllowed(`resolve-call-${endpoint}`, 3000);
            await delay(100); // Small delay between requests

            const response = await fetch(`${baseUrl}${endpoint}`, {
              headers: apiHeaders,
              cache: 'no-store'
            });

            if (await handleUnauthorizedResponse(response, `resolve_call_${endpoint}`)) {
              return;
            }

            if (!response.ok) {
              continue;
            }

            const payload = await response.json();
            const data = Array.isArray(payload?.data) ? payload.data : payload;

            if (Array.isArray(data)) {
              for (const item of data) {
                if (item?.agentId === agentId || item?.agent_id === agentId) {
                  if (typeof item?.id === 'string') {
                    candidates.push(item.id);
                  }
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ [STREAM] Call resolution fetch failed:', {
              endpoint,
              error
            });
          }

          if (candidates.length > 0) {
            break;
          }
        }

        if (candidates.length > 0) {
          const candidate = candidates[0];
          if (candidate !== resolvedCallId) {
            resolvedCallId = candidate;
            lastMessageCount = 0;
            console.log('✅ [STREAM] Resolved active call id', {
              agentId,
              callId: resolvedCallId
            });
            if (sessionId) {
              cachedSession = sessions.get(sessionId) ?? cachedSession;
              if (cachedSession) {
                if (
                  cachedSession.beyondPresenceSessionId !== resolvedCallId ||
                  cachedSession.beyondPresenceAgentId !== agentId
                ) {
                  cachedSession = {
                    ...cachedSession,
                    beyondPresenceSessionId: resolvedCallId,
                    beyondPresenceAgentId: agentId
                  };
                  sessions.set(sessionId, cachedSession);
                }
              }
            }
          }
        }
      };
      // Polling setup is defined below
      const startPolling = () => {
        if (!streamTranscriptsEnabled) {
          console.log('ℹ️ [STREAM] Polling skipped (BEY_STREAM_TRANSCRIPTS=false)', {
            agentId,
            sessionId
          });
          return;
        }
        if (callEndedNotified || interval) {
          return;
        }

        interval = setInterval(async () => {
          try {
            if (callEndedNotified) {
              return;
            }

            if (sessionId && (await checkSessionCompletion('session_completed_cache_poll'))) {
              return;
            }

            // Try different Beyond Presence API endpoints
          if (!resolvedCallId) {
            await resolveCallId();
          }

          if (resolvedCallId) {
            await fetchCallStatus(resolvedCallId);
            if (callEndedNotified) {
              return;
            }
          }

            if (!streamTranscriptsEnabled) {
              return;
            }

            // NOTE: BEY API does not support /v1/calls/{agentId}/messages
            // Only use callId-based endpoints
            const fetchEndpoints = resolvedCallId
              ? [`/v1/calls/${resolvedCallId}/messages`]
              : []; // Don't try agentId-based endpoints

            let response = null;
            let workingEndpoint = null;

            // Import rate limiter
            const { beyApiRateLimiter, delay } = await import('@/lib/utils/rate-limiter');

            for (const endpoint of fetchEndpoints) {
              try {
                // Rate limit: wait if needed before making request
                await beyApiRateLimiter.waitUntilAllowed(`messages-${endpoint}`, 3000);
                await delay(100); // Small delay between requests

                response = await fetch(
                  `${baseUrl}${endpoint}`,
                  {
                    headers: apiHeaders,
                    cache: 'no-store'
                  }
                );

                if (await handleUnauthorizedResponse(response, `messages_${endpoint}`)) {
                  return;
                }

                if (response.ok || response.status === 404 || response.status === 410) {
                  workingEndpoint = endpoint;
                  break;
                }
              } catch (error) {
                console.log(`Endpoint ${endpoint} failed:`, error instanceof Error ? error.message : String(error));
              }
            }

            console.log("Polling Beyond Presence:", {
              sessionId: agentId,
              status: response?.status,
              workingEndpoint,
              url: `${baseUrl}${workingEndpoint || `/v1/calls/${resolvedCallId || agentId}/messages`}`
            });

            if (response && response.ok) {
              const data = await response.json();

              // BEY API returns array directly for /v1/calls/{id}/messages
              const messages = Array.isArray(data) ? data : data.messages || [];

              console.log("Beyond Presence response:", {
                workingEndpoint,
                dataKeys: Array.isArray(data) ? 'array' : Object.keys(data),
                messageCount: messages.length,
                lastMessageCount,
                hasNewMessages: messages.length > lastMessageCount
              });

              if (messages.length > lastMessageCount) {
                // Send only new messages
                const newMessages = messages.slice(lastMessageCount);
                lastMessageCount = messages.length;
                idlePolls = 0;

                console.log("Sending new messages:", newMessages.length);

                for (const rawMessage of newMessages) {
                  const candidateId =
                    rawMessage?.call_id ||
                    rawMessage?.callId ||
                    rawMessage?.call?.id ||
                    rawMessage?.session_id ||
                    rawMessage?.sessionId ||
                    null;
                  if (typeof candidateId === 'string' && candidateId && candidateId !== resolvedCallId) {
                    resolvedCallId = candidateId;
                    lastCallResolveAttempt = Date.now();
                    lastMessageCount = messages.length;
                    console.log('ℹ️ [STREAM] Updated call id from message payload', {
                      agentId,
                      callId: resolvedCallId
                    });
                    break;
                  }
                }
                if (newMessages.some((msg: any) => msg?.type === 'event' && (msg?.event === 'call_ended' || msg?.status === 'ended'))) {
                  endStream('call_ended_event');
                }

              // Save to Weaviate if streaming transcripts is enabled
              if (streamTranscriptsEnabled && sessionId && newMessages.length > 0) {
                try {
                  const emailCandidate = (() => {
                    for (const msg of newMessages) {
                      const found = extractParticipantEmail(msg);
                      if (found) return found;
                    }
                    return null;
                  })();

                  const transcriptEntries = newMessages
                    .map((msg: any) => ({
                      speaker: msg.sender === 'ai' ? 'agent' : 'participant',
                      text: msg.message || msg.text || '',
                      timestamp: msg.sent_at || msg.timestamp || new Date().toISOString(),
                      raw: msg
                    }))
                    .filter((entry: any) => entry.text);

                  if (transcriptEntries.length > 0 || emailCandidate) {
                    const baseUrl =
                      process.env.NEXT_PUBLIC_BASE_URL ||
                      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

                    const body: Record<string, any> = {
                      sessionId,
                      transcript: transcriptEntries,
                      beyondPresenceAgentId: agentId,
                      beyondPresenceSessionId: resolvedCallId
                    };

                    if (emailCandidate) {
                      body.participantEmail = emailCandidate;
                    }

                    const transcriptResponse = await fetch(`${baseUrl}/api/sessions/update-transcript`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(body)
                    });

                    if (!transcriptResponse.ok) {
                      const errorText = await transcriptResponse.text();
                      console.error('❌ [STREAM] Failed to update transcript via API:', {
                        sessionId,
                        status: transcriptResponse.status,
                        statusText: transcriptResponse.statusText,
                        errorText
                      });
                    } else {
                      console.log(`✅ [STREAM] Forwarded ${transcriptEntries.length} messages to transcript updater`, {
                        sessionId,
                        includesEmail: Boolean(emailCandidate)
                      });
                      if (emailCandidate) {
                        const normalized = emailCandidate.toLowerCase();
                        lastPersistedEmail = normalized;
                        if (cachedSession) {
                          cachedSession = { ...cachedSession, participantEmail: normalized };
                          sessions.set(sessionId, cachedSession);
                        }
                      }
                    }
                  }
                } catch (weaviateError) {
                  console.error("Error updating transcript during stream:", weaviateError);
                }
              } else if (!streamTranscriptsEnabled) {
                console.log('ℹ️ [STREAM] Transcript persistence disabled, relying on webhooks', {
                  sessionId,
                  callId: resolvedCallId,
                  bufferedMessages: newMessages.length
                });
              }

                for (const message of newMessages) {
                  if (message.type === "audio" && message.audio_url) {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({
                          type: "audio",
                          audioUrl: message.audio_url,
                          timestamp: message.timestamp || new Date().toISOString(),
                        })}\n\n`
                      )
                    );
                  }

                  if (message.type === "text" && message.text) {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({
                          type: "text",
                          text: message.text,
                          timestamp: message.timestamp || new Date().toISOString(),
                        })}\n\n`
                      )
                    );
                  }

                  if (message.type === "video" && message.video_url) {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({
                          type: "video",
                          videoUrl: message.video_url,
                          timestamp: message.timestamp || new Date().toISOString(),
                        })}\n\n`
                      )
                    );
                  }

                  if (message.type === "agent_message") {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({
                          type: "agent_message",
                          text: message.text,
                          audioUrl: message.audio_url,
                          videoUrl: message.video_url,
                          timestamp: message.timestamp || new Date().toISOString(),
                        })}\n\n`
                      )
                    );
                  }
                }
              }
            } else {
              if (response && (await handleUnauthorizedResponse(response, `messages_${workingEndpoint ?? 'unknown'}`))) {
                return;
              }

              idlePolls += 1;
              const statusCode = response?.status ?? 0;
              const isMissing = statusCode === 404 || statusCode === 410;

              if (resolvedCallId && idlePolls >= MAX_IDLE_POLLS) {
                idlePolls = 0;
                await fetchCallStatus(resolvedCallId, { force: true });
                if (callEndedNotified) {
                  return;
                }
              }

              if (isMissing) {
                if (resolvedCallId) {
                  await fetchCallStatus(resolvedCallId, { force: true });
                  if (callEndedNotified) {
                    return;
                  }
                } else {
                  console.log('ℹ️ [STREAM] Awaiting Bey call start, messages endpoint not yet available', {
                    agentId,
                    sessionId
                  });
                }
                return;
              }

              const errorText = response ? await response.text() : 'No response received';
              console.error("Beyond Presence stream error:", {
                status: statusCode,
                statusText: response?.statusText,
                errorText,
                sessionId: agentId
              });

              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    message: `Beyond Presence API error: ${statusCode || 'unknown'} - ${errorText}`,
                  })}\n\n`
                )
              );
            }
          } catch (error) {
            console.error("Error polling Beyond Presence:", error);
            try {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    message: "Connection error",
                  })}\n\n`
                )
              );
            } catch (controllerError) {
              console.error("Controller already closed:", controllerError);
              if (interval) {
                clearInterval(interval);
                interval = null;
              }
              if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
              }
            }
          }
        }, 5000); // Poll every 5 seconds (reduced frequency to prevent rate limiting)

        keepAliveInterval = setInterval(() => {
          if (callEndedNotified) {
            return;
          }
          try {
            controller.enqueue(encoder.encode(`: keepalive\n\n`));
          } catch (error) {
              console.error("Controller closed during keepalive:", error);
              if (interval) {
                clearInterval(interval);
                interval = null;
              }
              if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
              }
            }
          }, 15000);
      };

      if (streamTranscriptsEnabled) {
        startPolling();
      }

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        console.log('ℹ️ [STREAM] Request aborted, closing stream', { agentId, sessionId });
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        try {
          controller.close();
        } catch (error) {
          console.warn('⚠️ [STREAM] Failed to close controller after abort:', error);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
