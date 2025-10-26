import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Validate required environment variables
    if (!process.env.BEY_API_KEY) {
      throw new Error("BEY_API_KEY must be set");
    }

    // Check session status with Beyond Presence API
    const response = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}`, {
      method: "GET",
      headers: {
        "x-api-key": process.env.BEY_API_KEY!,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: "Session not found",
            sessionId,
            status: "not_found"
          },
          { status: 404 }
        );
      }

      const errorText = await response.text();
      console.error("Beyond Presence session status error:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        sessionId,
        apiUrl: `${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}`
      });
      
      return NextResponse.json(
        { 
          error: `Failed to get session status: ${response.status} - ${errorText}`,
          sessionId,
          status: "error"
        },
        { status: response.status }
      );
    }

    const sessionData = await response.json();
    
    // Determine session status based on Beyond Presence response
    let status = "unknown";
    if (sessionData.started_at && !sessionData.ended_at) {
      status = "active";
    } else if (sessionData.ended_at) {
      status = "ended";
    } else {
      status = "created";
    }

    console.log("Beyond Presence session status retrieved:", {
      sessionId: sessionData.id,
      status,
      sessionData
    });

    return NextResponse.json({
      sessionId: sessionData.id,
      avatarId: sessionData.avatar_id,
      livekitUrl: sessionData.livekit_url,
      startedAt: sessionData.started_at,
      endedAt: sessionData.ended_at,
      transportType: sessionData.transport_type,
      status,
      isActive: status === "active"
    });

  } catch (error) {
    console.error("Error getting Beyond Presence session status:", error);
    return NextResponse.json(
      { 
        error: `Failed to get session status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: "error"
      },
      { status: 500 }
    );
  }
}

// Also support POST for compatibility
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Redirect to GET method with query parameter
    const url = new URL(request.url);
    url.searchParams.set('sessionId', sessionId);
    
    // Create a new request for the GET method
    const getRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers,
    });
    
    return GET(getRequest);
    
  } catch (error) {
    console.error("Error in POST session status:", error);
    return NextResponse.json(
      { 
        error: `Failed to get session status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: "error"
      },
      { status: 500 }
    );
  }
}
