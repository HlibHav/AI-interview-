import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import BeyondPresence from "@bey-dev/sdk";

// In-memory session tracking for idempotency
const activeSessions = new Map<string, { sessionId: string; roomName: string; createdAt: number; status: string }>();

export async function POST(request: NextRequest) {
  try {
    const { participantEmail, interviewId } = await request.json();

    console.log("🔍 Create-session request received:", {
      participantEmail,
      interviewId,
      hasInterviewId: !!interviewId
    });

    // Use interviewId for idempotency if provided
    const idempotencyKey = interviewId;

    // Check if session already exists and is less than 30 minutes old
    if (idempotencyKey && activeSessions.has(idempotencyKey)) {
      const existing = activeSessions.get(idempotencyKey)!;
      const ageMinutes = (Date.now() - existing.createdAt) / (1000 * 60);

      if (ageMinutes < 30) {
        console.log(`🔄 Returning existing BP session for ${idempotencyKey}:`, existing.sessionId);
        return NextResponse.json({
          sessionId: existing.sessionId,
          avatarId: process.env.BEY_AVATAR_ID,
          livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
          startedAt: new Date(existing.createdAt).toISOString(),
          transportType: "livekit",
          roomName: existing.roomName,
          status: existing.status
        });
      } else {
        // Remove expired session
        activeSessions.delete(idempotencyKey);
      }
    }

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

    // Verify credentials are not empty
    if (!process.env.BEY_API_KEY.trim() || !process.env.BEY_AVATAR_ID.trim()) {
      console.error("❌ Credentials are empty or whitespace");
      return NextResponse.json(
        { error: "Invalid credentials: API key or Avatar ID is empty" },
        { status: 400 }
      );
    }

    // Initialize Beyond Presence SDK
    const bey = new BeyondPresence({
      apiKey: process.env.BEY_API_KEY!,
    });

    console.log("📝 Creating new Beyond Presence session with:", {
      avatar_id: process.env.BEY_AVATAR_ID!,
      livekit_url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      interviewId
    });

      // Create speech-to-video session using Beyond Presence SDK
      let session;
      try {
        console.log("🔍 Creating BP session (BP will auto-create agent):", {
          avatar_id: process.env.BEY_AVATAR_ID!,
          livekit_url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
          interviewId: interviewId
        });

        // Generate LiveKit token for the interview room (BP will use this as the room)
        const livekitToken = new AccessToken(
          process.env.LIVEKIT_API_KEY!,
          process.env.LIVEKIT_API_SECRET!,
          {
            identity: `bey-agent-${interviewId}`,
            name: `Beyond Presence Agent`,
          }
        );

        // Grant permissions for the interview room
        livekitToken.addGrant({
          roomJoin: true,
          room: interviewId, // Use interviewId as room name
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        });

        const jwt = await livekitToken.toJwt();

        console.log("🔍 Generated BP session token for room:", {
          room_name: interviewId,
          agent_identity: `bey-agent-${interviewId}`,
          token_length: jwt.length
        });

        // Create BP session with token
        session = await bey.session.create({
          avatar_id: process.env.BEY_AVATAR_ID!,
          livekit_url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
          livekit_token: jwt,
        });

        console.log("✅ BP session created, agent auto-created by BP:", {
          sessionId: session.id,
          avatarId: session.avatar_id,
          livekitUrl: session.livekit_url
        });

        // BP sessions are automatically active once created - no REST API calls needed
        console.log("✅ Beyond Presence session created successfully:", {
          sessionId: session.id,
          avatarId: session.avatar_id,
          livekitUrl: session.livekit_url,
          roomName: interviewId,
          transportType: 'livekit'
        });

        // Store session in memory for idempotency
        if (idempotencyKey) {
          activeSessions.set(idempotencyKey, {
            sessionId: session.id,
            roomName: interviewId,
            createdAt: Date.now(),
            status: "active"
          });
        }

        // Return session details immediately - no additional REST calls needed
        const responseData = {
          sessionId: session.id,
          avatarId: session.avatar_id,
          livekitUrl: session.livekit_url,
          startedAt: session.created_at,
          transportType: "livekit",
          roomName: interviewId,
          status: "active",
        };

        console.log("🔍 Returning session data:", responseData);
        return NextResponse.json(responseData);

      } catch (error: any) {
        console.error("❌ Beyond Presence session creation failed:", {
          error: error.message,
          status: error.status,
          response: error.response?.data
        });
        throw error;
      }

  } catch (error) {
    console.error("❌ Error creating Beyond Presence session:", error);

    // Provide more specific error messages
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for credential-related errors
      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        errorMessage = "Invalid Beyond Presence credentials. Please verify BEY_API_KEY and BEY_AVATAR_ID.";
      } else if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
        errorMessage = "Beyond Presence avatar not found. Please verify BEY_AVATAR_ID.";
      } else if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        errorMessage = "Beyond Presence API access denied. Please verify BEY_API_KEY permissions.";
      }
    }

    return NextResponse.json(
      { error: `Failed to create session: ${errorMessage}` },
      { status: 500 }
    );
  }
}

