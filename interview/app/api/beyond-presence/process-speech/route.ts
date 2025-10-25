import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, audioData, participantEmail, mimeType, transcript, interviewSessionId } = await request.json();

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
      // Convert base64 back to binary using Buffer (Node.js compatible)
      const binaryAudio = Buffer.from(audioData, 'base64');
      
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
        console.error("Beyond Presence audio processing error:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
          sessionId,
          apiUrl: `${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}/audio`
        });
        throw new Error(`Failed to process audio with Beyond Presence: ${response.status} - ${errorText}`);
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

    // If we have transcript text, process it through our interviewer agent for follow-up decisions
    if (transcript) {
      console.log("Sending transcript to Beyond Presence session:", sessionId);
      
      // First, optionally check with our interviewer agent if a follow-up is needed
      // This integrates with the existing multi-agent system
      if (interviewSessionId) {
        try {
          // Call our interviewer agent to decide on follow-ups
          const interviewerResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/agents/interviewer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              participantResponse: transcript,
              sessionId: interviewSessionId,
              // Additional context can be added here
            }),
          });

          if (interviewerResponse.ok) {
            const decision = await interviewerResponse.json();
            console.log("Interviewer agent decision:", decision);
            // Store the decision for later use
            // Could modify the response sent to Beyond Presence based on this
          }
        } catch (error) {
          console.error("Error calling interviewer agent:", error);
          // Continue anyway - don't block the participant
        }
      }

      // Send the transcript to Beyond Presence
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
        console.error("Beyond Presence message processing error:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
          sessionId,
          apiUrl: `${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}/messages`
        });
        throw new Error(`Failed to process message with Beyond Presence: ${response.status} - ${errorText}`);
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

