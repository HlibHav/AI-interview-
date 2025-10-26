// app/api/simple-agent/route.ts
// Simple agent API without Beyond Presence SDK

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { interviewId, participantEmail, researchGoal } = await request.json();

    console.log("🤖 Creating simple agent for:", interviewId);

    // Just return a simple response without using Beyond Presence SDK
    return NextResponse.json({
      success: true,
      agentId: `simple-agent-${interviewId}`,
      roomName: interviewId,
      status: 'ready',
      message: 'Simple agent created successfully (without Beyond Presence SDK)',
      createdAt: Date.now()
    });

  } catch (error) {
    console.error("❌ Error creating simple agent:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to create simple agent",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
