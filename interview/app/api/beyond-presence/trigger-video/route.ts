import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Validate required environment variables
    if (!process.env.BEY_API_KEY) {
      throw new Error("BEY_API_KEY must be set");
    }

    console.log("🎬 Triggering video stream for Beyond Presence session:", sessionId);

    // Try multiple approaches to trigger video streaming
    const triggerMessage = message || "Hello, please start the video stream and begin the interview.";
    
    // Approach 1: Send a message to trigger the agent
    try {
      const messageResponse = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.BEY_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user_message",
          text: triggerMessage,
          timestamp: new Date().toISOString(),
        }),
      });

      if (messageResponse.ok) {
        const messageResult = await messageResponse.json();
        console.log("✅ Trigger message sent successfully:", messageResult);
        
        return NextResponse.json({
          success: true,
          method: "message_trigger",
          sessionId,
          message: "Video stream trigger message sent successfully",
          result: messageResult
        });
      } else {
        console.warn("⚠️ Message trigger failed:", messageResponse.status, await messageResponse.text());
      }
    } catch (messageError) {
      console.warn("⚠️ Message trigger error:", messageError);
    }

    // Approach 2: Try to start/resume the session
    try {
      const startResponse = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}/start`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.BEY_API_KEY!,
          "Content-Type": "application/json",
        },
      });

      if (startResponse.ok) {
        const startResult = await startResponse.json();
        console.log("✅ Session start/resume successful:", startResult);
        
        return NextResponse.json({
          success: true,
          method: "session_start",
          sessionId,
          message: "Session started/resumed successfully",
          result: startResult
        });
      } else {
        console.warn("⚠️ Session start failed:", startResponse.status, await startResponse.text());
      }
    } catch (startError) {
      console.warn("⚠️ Session start error:", startError);
    }

    // Approach 3: Try to get session status and trigger based on that
    try {
      const statusResponse = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}`, {
        method: "GET",
        headers: {
          "x-api-key": process.env.BEY_API_KEY!,
          "Content-Type": "application/json",
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log("✅ Session status retrieved:", statusData);
        
        // If session is active, try sending another message
        if (statusData.started_at && !statusData.ended_at) {
          console.log("🔄 Session is active, sending activation message...");
          
          // Try sending an activation message
          const activationResponse = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}/messages`, {
            method: "POST",
            headers: {
              "x-api-key": process.env.BEY_API_KEY!,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "system_message",
              text: "Activate video streaming and begin interaction",
              timestamp: new Date().toISOString(),
            }),
          });

          if (activationResponse.ok) {
            const activationResult = await activationResponse.json();
            console.log("✅ Activation message sent:", activationResult);
            
            return NextResponse.json({
              success: true,
              method: "activation_message",
              sessionId,
              message: "Video activation message sent successfully",
              sessionStatus: statusData,
              result: activationResult
            });
          }
        }
        
        return NextResponse.json({
          success: true,
          method: "status_check",
          sessionId,
          message: "Session status retrieved - video should start automatically",
          sessionStatus: statusData
        });
      }
    } catch (statusError) {
      console.warn("⚠️ Status check error:", statusError);
    }

    // If all approaches failed, return a partial success
    console.warn("⚠️ All trigger approaches failed, but session may still work");
    return NextResponse.json({
      success: false,
      sessionId,
      message: "Video trigger attempts failed, but session may still activate automatically",
      attempted_methods: ["message_trigger", "session_start", "status_check"]
    }, { status: 207 }); // 207 Multi-Status

  } catch (error) {
    console.error("Error triggering Beyond Presence video:", error);
    return NextResponse.json(
      { 
        error: `Failed to trigger video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      },
      { status: 500 }
    );
  }
}

// Also support GET for debugging
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId query parameter is required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: "Video trigger endpoint is available",
    sessionId,
    usage: "POST to this endpoint with { sessionId, message? } to trigger video streaming"
  });
}
