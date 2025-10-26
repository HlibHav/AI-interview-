import { NextRequest, NextResponse } from "next/server";

// Import the activeSessions map from create-session route
// Note: In a real production app, this should be in a shared module or database
const activeSessions = new Map<string, { sessionId: string; createdAt: number; status: string }>();

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

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

    console.log("🧹 Cleaning up Beyond Presence session:", sessionId);

    // Remove from in-memory map
    for (const [key, value] of activeSessions.entries()) {
      if (value.sessionId === sessionId) {
        activeSessions.delete(key);
        console.log(`🗑️ Removed session ${sessionId} from memory map (key: ${key})`);
        break;
      }
    }

    // Try to end the session gracefully via Beyond Presence API
    try {
      const response = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${sessionId}/end`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.BEY_API_KEY!,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Beyond Presence session ended successfully:", result);
        
        return NextResponse.json({
          success: true,
          sessionId,
          status: "ended",
          message: "Session cleaned up successfully"
        });
      } else {
        // Session might already be ended or not found - this is often expected
        const errorText = await response.text();
        console.log("ℹ️ Session cleanup response:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
          sessionId
        });
        
        // Don't treat 404 as an error - session might already be cleaned up
        if (response.status === 404) {
          return NextResponse.json({
            success: true,
            sessionId,
            status: "not_found",
            message: "Session was already cleaned up or not found"
          });
        }
        
        return NextResponse.json({
          success: false,
          sessionId,
          status: "error",
          message: `Cleanup failed: ${response.status} - ${errorText}`
        }, { status: response.status });
      }
    } catch (apiError) {
      console.warn("⚠️ Beyond Presence API cleanup failed:", apiError);
      
      // Return success anyway - cleanup is best-effort
      return NextResponse.json({
        success: true,
        sessionId,
        status: "api_error",
        message: "Cleanup attempted but API call failed - this is often expected"
      });
    }

  } catch (error) {
    console.error("Error during Beyond Presence cleanup:", error);
    return NextResponse.json(
      { 
        error: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      },
      { status: 500 }
    );
  }
}

// DELETE method for RESTful cleanup
export async function DELETE(request: NextRequest) {
  return POST(request); // Same logic as POST
}

// Also support GET for debugging/status checking
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId query parameter is required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: "Cleanup endpoint is available",
    sessionId,
    usage: "POST or DELETE to this endpoint with { sessionId } to cleanup a session"
  });
}
