import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

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
            `/v1/sessions/${agentId}/messages`,
            `/v1/sessions/${agentId}/events`,
            `/v1/sessions/${agentId}/stream`,
            `/v1/sessions/${agentId}`
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
              console.log(`Endpoint ${endpoint} failed:`, error.message);
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
            console.log("Beyond Presence response:", { 
              workingEndpoint,
              dataKeys: Object.keys(data),
              messageCount: data.messages?.length || 0, 
              lastMessageCount,
              hasNewMessages: data.messages && data.messages.length > lastMessageCount
            });
            
            if (data.messages && data.messages.length > lastMessageCount) {
              // Send only new messages
              const newMessages = data.messages.slice(lastMessageCount);
              lastMessageCount = data.messages.length;
              
              console.log("Sending new messages:", newMessages.length);
              
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
            const errorText = await response.text();
            console.error("Beyond Presence stream error:", {
              status: response.status,
              statusText: response.statusText,
              errorText,
              sessionId: agentId
            });
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message: `Beyond Presence API error: ${response.status} - ${errorText}`,
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

