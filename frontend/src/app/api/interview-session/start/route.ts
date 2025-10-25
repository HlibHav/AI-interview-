import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, participantEmail, researchGoal } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Create access token for the participant
    const participantToken = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
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

    // Create access token for the AI agent
    const agentToken = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: `ai-interviewer-${sessionId}`,
        name: "AI Research Interviewer",
      }
    );

    // Grant permissions for agent
    agentToken.addGrant({
      room: sessionId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    const participantJwt = await participantToken.toJwt();
    const agentJwt = await agentToken.toJwt();

    // Store session metadata in Weaviate
    await storeSessionMetadata(sessionId, participantEmail, researchGoal);

    return NextResponse.json({ 
      participantToken: participantJwt,
      agentToken: agentJwt,
      roomName: sessionId,
      researchGoal: researchGoal || "General user research and product validation"
    });

  } catch (error) {
    console.error("Error starting interview session:", error);
    return NextResponse.json(
      { error: "Failed to start interview session" },
      { status: 500 }
    );
  }
}

async function storeSessionMetadata(sessionId: string, participantEmail: string, researchGoal: string) {
  try {
    // This would integrate with your Weaviate setup
    // For now, just log the session start
    console.log(`Starting interview session: ${sessionId}`);
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
