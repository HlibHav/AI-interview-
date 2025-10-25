import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  if (!agentId) {
    return new Response("Session ID is required", { status: 400 });
  }

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

      // Poll Beyond Presence for new responses
      const interval = setInterval(async () => {
        try {
          const response = await fetch(
            `${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${agentId}/messages`,
            {
              headers: {
                "x-api-key": process.env.BEY_API_KEY!,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
              // Send the latest message
              const latestMessage = data.messages[data.messages.length - 1];
              
              if (latestMessage.type === "audio" && latestMessage.audio_url) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "audio",
                      audioUrl: latestMessage.audio_url,
                      timestamp: latestMessage.timestamp || new Date().toISOString(),
                    })}\n\n`
                  )
                );
              }

              if (latestMessage.type === "text" && latestMessage.text) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "text",
                      text: latestMessage.text,
                      timestamp: latestMessage.timestamp || new Date().toISOString(),
                    })}\n\n`
                  )
                );
              }

              if (latestMessage.type === "video" && latestMessage.video_url) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "video",
                      videoUrl: latestMessage.video_url,
                      timestamp: latestMessage.timestamp || new Date().toISOString(),
                    })}\n\n`
                  )
                );
              }
            }
          }
        } catch (error) {
          console.error("Error polling Beyond Presence:", error);
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Connection error",
              })}\n\n`
            )
          );
        }
      }, 2000); // Poll every 2 seconds

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
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
