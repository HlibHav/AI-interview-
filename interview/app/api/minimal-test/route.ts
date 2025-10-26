// app/api/minimal-test/route.ts
// Minimal test without any LiveKit or Beyond Presence code

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Minimal test - no external dependencies");

    return NextResponse.json({
      success: true,
      message: "Minimal test successful - no LiveKit or Beyond Presence code",
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("❌ Minimal test failed:", error);
    
    return NextResponse.json(
      { 
        error: "Minimal test failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
