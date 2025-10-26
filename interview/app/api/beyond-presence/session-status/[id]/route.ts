import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Fetch current BP session state from BP API
    const response = await fetch(
      `https://api.bey.dev/v1/sessions/${sessionId}`,
      {
        headers: {
          'X-API-Key': process.env.BEY_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ BP session fetch failed:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        sessionId
      });
      
      return NextResponse.json(
        { error: `BP session fetch failed: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const sessionData = await response.json();
    
    console.log("📊 BP session status:", {
      sessionId,
      transportType: sessionData.transport_type,
      livekitUrl: sessionData.livekit_url,
      status: sessionData.status || 'active'
    });

    return NextResponse.json({
      sessionId: sessionData.id,
      transportType: sessionData.transport_type,
      livekitUrl: sessionData.livekit_url,
      status: sessionData.status || 'active',
      avatarId: sessionData.avatar_id,
      startedAt: sessionData.started_at,
      roomName: sessionData.room_name || sessionData.id // Include room name for consistency
    });

  } catch (error) {
    console.error("❌ Error fetching BP session status:", error);
    return NextResponse.json(
      { error: `Failed to fetch session status: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
