import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  if (!agentId) {
    return new Response("Agent ID is required", { status: 400 });
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

      // Simulate streaming responses from Beyond Presence
      const interval = setInterval(async () => {
        try {
          // Poll Beyond Presence for new responses
          const response = await fetch(
            `${process.env.BEY_API_KEY}/agents/${agentId}/responses`,
            {
              headers: {
                "Authorization": `Bearer ${process.env.BEY_API_KEY}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            
            if (data.hasNewResponse) {
              // Send audio response
              if (data.audioUrl) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "audio",
                      audioUrl: data.audioUrl,
                      timestamp: new Date().toISOString(),
                    })}\n\n`
                  )
                );
              }

              // Send text response
              if (data.text) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "text",
                      text: data.text,
                      timestamp: new Date().toISOString(),
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
      }, 1000); // Poll every second

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
