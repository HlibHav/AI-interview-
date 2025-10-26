// app/api/test-bp/route.ts
// Minimal test to isolate Beyond Presence SDK issue

import { NextRequest, NextResponse } from "next/server";
import BeyondPresence from '@bey-dev/sdk';

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Testing Beyond Presence SDK...");

    // Test 1: Create BP instance
    const bey = new BeyondPresence({
      apiKey: process.env.BEY_API_KEY!,
    });

    console.log("✅ BP instance created");

    // Test 2: Create session with minimal LiveKit params
    const session = await bey.session.create({
      avatar_id: process.env.BEY_AVATAR_ID!,
      livekit_url: process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880",
      livekit_token: "dummy-token" // Temporary dummy token for testing
    });

    console.log("✅ BP session created:", session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      message: "Beyond Presence SDK test successful"
    });

  } catch (error) {
    console.error("❌ Beyond Presence SDK test failed:", error);
    
    return NextResponse.json(
      { 
        error: "Beyond Presence SDK test failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
