import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, participantEmail } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Initialize Beyond Presence agent
    const response = await fetch(`${process.env.BEYOND_PRESENCE_API_URL}/agents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.BEYOND_PRESENCE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        participantEmail: participantEmail || "anonymous",
        agentType: "interviewer",
        configuration: {
          voice: "professional",
          personality: "empathetic",
          language: "en-US",
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to initialize Beyond Presence agent");
    }

    const agentData = await response.json();

    return NextResponse.json({
      agentId: agentData.agentId,
      avatarUrl: agentData.avatarUrl,
      status: "initialized",
    });

  } catch (error) {
    console.error("Error initializing Beyond Presence:", error);
    return NextResponse.json(
      { error: "Failed to initialize AI agent" },
      { status: 500 }
    );
  }
}
