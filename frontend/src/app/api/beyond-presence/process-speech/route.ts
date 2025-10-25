import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, audioData, participantEmail, mimeType, transcript } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    console.log("Processing speech for session:", sessionId);
    console.log("Audio data size:", audioData ? audioData.length : 0);
    console.log("Transcript:", transcript);

    // If we have audio data, send it to Beyond Presence
    if (audioData) {
      // Convert base64 back to binary
      const binaryAudio = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
      
      const response = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}/audio`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.BEY_API_KEY!,
          "Content-Type": mimeType || "audio/webm",
        },
        body: binaryAudio,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Beyond Presence audio processing error:", errorText);
        throw new Error(`Failed to process audio with Beyond Presence: ${response.status}`);
      }

      const result = await response.json();
      console.log("Audio processing result:", result);

      return NextResponse.json({
        success: true,
        responseId: result.responseId || result.id,
        estimatedResponseTime: result.estimatedResponseTime || 2000,
        audioProcessed: true
      });
    }

    // If we have transcript text, send it to Beyond Presence
    if (transcript) {
      console.log("Sending transcript to Beyond Presence session:", sessionId);
      
      const response = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.BEY_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user_message",
          text: transcript,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Beyond Presence message processing error:", errorText);
        console.error("Session ID used:", sessionId);
        console.error("API URL:", `${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}/messages`);
        throw new Error(`Failed to process message with Beyond Presence: ${response.status}`);
      }

      const result = await response.json();
      console.log("Message processing result:", result);

      return NextResponse.json({
        success: true,
        responseId: result.responseId || result.id,
        estimatedResponseTime: result.estimatedResponseTime || 2000,
        messageProcessed: true
      });
    }

    return NextResponse.json({
      success: false,
      error: "No audio data or transcript provided"
    });

  } catch (error) {
    console.error("Error processing speech:", error);
    return NextResponse.json(
      { error: `Failed to process speech: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
