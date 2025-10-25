import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(request: NextRequest) {
  try {
    const { participantEmail } = await request.json();

    // Generate a LiveKit token for the Beyond Presence agent
    const sessionId = `bey-session-${Date.now()}`;
    const livekitToken = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: `bey-agent-${Date.now()}`,
        name: "Beyond Presence Agent",
      }
    );

    // Grant permissions for the agent
    livekitToken.addGrant({
      room: sessionId,
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
      livekit_url: process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://monitizorcoach-mf45xk0u.livekit.cloud",
      livekit_token: livekitJwt,
      transport_type: "livekit"
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
      console.error("Beyond Presence session creation error:", errorText);
      throw new Error(`Failed to create Beyond Presence session: ${response.status} - ${errorText}`);
    }

    const sessionData = await response.json();

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
