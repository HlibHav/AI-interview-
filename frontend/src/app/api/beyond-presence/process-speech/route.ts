import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, transcript, participantEmail } = await request.json();

    if (!sessionId || !transcript) {
      return NextResponse.json(
        { error: "Session ID and transcript are required" },
        { status: 400 }
      );
    }

    // Send transcript to Beyond Presence for processing
    const response = await fetch(`${process.env.BEY_API_KEY}/agents/process`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.BEY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        transcript,
        participantEmail: participantEmail || "anonymous",
        context: {
          timestamp: new Date().toISOString(),
          sessionType: "interview",
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to process speech with Beyond Presence");
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      responseId: result.responseId,
      estimatedResponseTime: result.estimatedResponseTime,
    });

  } catch (error) {
    console.error("Error processing speech:", error);
    return NextResponse.json(
      { error: "Failed to process speech" },
      { status: 500 }
    );
  }
}
