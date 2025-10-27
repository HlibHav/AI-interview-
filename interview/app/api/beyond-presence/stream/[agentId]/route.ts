import { NextRequest } from "next/server";
import { upsertInterviewChunks } from '@/lib/weaviate/weaviate-session';

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

      // Poll Beyond Presence for new responses
      const interval = setInterval(async () => {
        try {
          // Try different Beyond Presence API endpoints
          const endpoints = [
            `/v1/calls/${agentId}/messages`,
            `/v1/calls/${agentId}`
          ];
          
          let response = null;
          let workingEndpoint = null;
          
          for (const endpoint of endpoints) {
            try {
              response = await fetch(
                `${process.env.BEY_API_URL || 'https://api.bey.dev'}${endpoint}`,
                {
                  headers: {
                    "x-api-key": process.env.BEY_API_KEY!,
                  },
                }
              );
              
              if (response.ok) {
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
            url: `${process.env.BEY_API_URL || 'https://api.bey.dev'}${workingEndpoint || `/v1/sessions/${agentId}/messages`}`
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
              
              console.log("Sending new messages:", newMessages.length);
              
              // Save to Weaviate if sessionId is available
              if (sessionId && newMessages.length > 0) {
                try {
                  const transcriptEntries = newMessages.map((msg: any) => ({
                    speaker: msg.sender === 'ai' ? 'agent' : 'participant',
                    text: msg.message || msg.text || '',
                    timestamp: msg.sent_at || msg.timestamp || new Date().toISOString(),
                    raw: msg
                  })).filter((entry: any) => entry.text);
                  
                  if (transcriptEntries.length > 0) {
                    await upsertInterviewChunks(sessionId, sessionId, transcriptEntries);
                    console.log(`Saved ${transcriptEntries.length} messages to Weaviate`);
                  }
                } catch (weaviateError) {
                  console.error("Error saving to Weaviate:", weaviateError);
                }
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
            const errorText = response ? await response.text() : 'No response received';
            console.error("Beyond Presence stream error:", {
              status: response?.status,
              statusText: response?.statusText,
              errorText,
              sessionId: agentId
            });
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message: `Beyond Presence API error: ${response?.status || 'unknown'} - ${errorText}`,
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
            clearInterval(interval);
            clearInterval(keepAliveInterval);
          }
        }
      }, 2000); // Poll every 2 seconds

      // Send keepalive every 15 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(
            new TextEncoder().encode(`: keepalive\n\n`)
          );
        } catch (error) {
          console.error("Controller closed during keepalive:", error);
          clearInterval(interval);
          clearInterval(keepAliveInterval);
        }
      }, 15000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(keepAliveInterval);
        controller.close();
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

