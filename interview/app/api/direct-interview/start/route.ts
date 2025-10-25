import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(request: NextRequest) {
  try {
    const { participantEmail, researchGoal } = await request.json();

    // Check if required environment variables are available
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      console.error("Missing LiveKit credentials:", {
        apiKey: !!process.env.LIVEKIT_API_KEY,
        apiSecret: !!process.env.LIVEKIT_API_SECRET
      });
      return NextResponse.json(
        { error: "LiveKit credentials not configured" },
        { status: 500 }
      );
    }

    // Generate a unique session ID
    const sessionId = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create access token for the participant
    const participantToken = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: participantEmail || `participant-${Date.now()}`,
        name: participantEmail || "Anonymous Participant",
      }
    );

    // Grant permissions for participant
    participantToken.addGrant({
      room: sessionId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const participantJwt = await participantToken.toJwt();

    // Store session metadata in Weaviate
    await storeSessionMetadata(sessionId, participantEmail, researchGoal);

    return NextResponse.json({ 
      sessionId,
      participantToken: participantJwt,
      roomName: sessionId,
      researchGoal: researchGoal || "General user research and product validation",
      beyIntegration: true
    });

  } catch (error) {
    console.error("Error starting direct interview session:", error);
    return NextResponse.json(
      { error: `Failed to start interview session: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function storeSessionMetadata(sessionId: string, participantEmail: string, researchGoal: string) {
  try {
    // This would integrate with your Weaviate setup
    // For now, just log the session start
    console.log(`Starting direct interview session: ${sessionId}`);
    console.log(`Participant: ${participantEmail}`);
    console.log(`Research Goal: ${researchGoal}`);
    
    // You can implement actual Weaviate storage here
    // const sessionData = {
    //   session_id: sessionId,
    //   participant_email: participantEmail,
    //   research_goal: researchGoal,
    //   start_time: new Date().toISOString(),
    //   status: "active"
    // };
    // await weaviateClient.collections.get("InterviewSessions").data.insert(sessionData);
    
  } catch (error) {
    console.error("Failed to store session metadata:", error);
  }
}
