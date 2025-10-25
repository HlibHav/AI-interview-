import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(request: NextRequest) {
  try {
    const { participantEmail, agentId, roomName } = await request.json();

    // Validate required environment variables
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
    }
    if (!process.env.BEY_API_KEY || !process.env.BEY_AVATAR_ID) {
      throw new Error("BEY_API_KEY and BEY_AVATAR_ID must be set");
    }
    if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
      throw new Error("NEXT_PUBLIC_LIVEKIT_URL must be set");
    }

    if (!roomName) {
      return NextResponse.json(
        { error: "roomName is required" },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    // Generate a LiveKit token for the Beyond Presence agent using the same room as participant
    const livekitToken = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: `bey-agent-${Date.now()}`,
        name: "Beyond Presence Agent",
      }
    );

    // Grant permissions for the agent to join the same room as participant
    livekitToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    const livekitJwt = await livekitToken.toJwt();

    // Create speech-to-video session using Beyond Presence API
    const requestBody = {
      avatar_id: process.env.BEY_AVATAR_ID!,
      livekit_url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      livekit_token: livekitJwt,
      transport_type: "livekit",
      agent_id: agentId, // Link to the initialized agent
    };

    const response = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions`, {
      method: "POST",
      headers: {
        "x-api-key": process.env.BEY_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Beyond Presence session creation error:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        roomName,
        agentId,
        apiUrl: `${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions`
      });
      throw new Error(`Failed to create Beyond Presence session: ${response.status} - ${errorText}`);
    }

    const sessionData = await response.json();
    console.log("Beyond Presence session created successfully:", {
      sessionId: sessionData.id,
      roomName,
      agentId,
      sessionData
    });

    // Start the session
    try {
      const startResponse = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionData.id}/start`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.BEY_API_KEY!,
          "Content-Type": "application/json",
        },
      });

      if (startResponse.ok) {
        const startData = await startResponse.json();
        console.log("Beyond Presence session started:", startData);
        
        // Wait a moment for the session to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Send an initial message to trigger the avatar
        try {
          const initialMessageResponse = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionData.id}/messages`, {
            method: "POST",
            headers: {
              "x-api-key": process.env.BEY_API_KEY!,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "user_message",
              text: "Hello, I'm ready to start the interview.",
              timestamp: new Date().toISOString(),
            }),
          });
          
          if (initialMessageResponse.ok) {
            console.log("Initial message sent to Beyond Presence session");
          } else {
            const errorText = await initialMessageResponse.text();
            console.error("Failed to send initial message:", {
              status: initialMessageResponse.status,
              errorText
            });
          }
        } catch (error) {
          console.error("Error sending initial message:", error);
        }
      } else {
        const errorText = await startResponse.text();
        console.error("Failed to start Beyond Presence session:", {
          status: startResponse.status,
          errorText
        });
      }
    } catch (error) {
      console.error("Error starting Beyond Presence session:", error);
    }

    return NextResponse.json({
      sessionId: sessionData.id,
      avatarId: sessionData.avatar_id,
      livekitUrl: sessionData.livekit_url,
      startedAt: sessionData.started_at,
      transportType: sessionData.transport_type,
      status: "created"
    });

  } catch (error) {
    console.error("Error creating Beyond Presence session:", error);
    return NextResponse.json(
      { error: `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

