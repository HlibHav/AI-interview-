// app/api/beyond-presence/agent/route.ts
// Enhanced BP agent API following official plugin patterns

import { NextRequest, NextResponse } from "next/server";
import { createLiveKitBPAgentService, createAgentConfigFromEnv } from "../../../lib/livekit-bp-agent-service";

// In-memory agent tracking (in production, use a database)
const activeAgents = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { 
      interviewId, 
      participantEmail, 
      researchGoal, 
      interviewScript,
      systemPrompt 
    } = await request.json();

    console.log("🤖 Creating BP Agent request (using Create Agent API):", {
      interviewId,
      participantEmail,
      hasResearchGoal: !!researchGoal,
      hasScript: !!interviewScript,
      hasSystemPrompt: !!systemPrompt
    });

    // Validate required environment variables
    if (!process.env.BEY_API_KEY || !process.env.BEY_AVATAR_ID) {
      throw new Error("BEY_API_KEY and BEY_AVATAR_ID must be set");
    }

    // Check if agent already exists for this interview
    if (activeAgents.has(interviewId)) {
      const existing = activeAgents.get(interviewId);
      const ageMinutes = (Date.now() - existing.createdAt) / (1000 * 60);
      
      if (ageMinutes < 30) {
        console.log(`🔄 Returning existing BP Agent for ${interviewId}`);
        return NextResponse.json({
          agentId: existing.agentId,
          agent: existing.agent,
          status: existing.status,
          createdAt: existing.createdAt
        });
      } else {
        // Remove expired agent
        activeAgents.delete(interviewId);
      }
    }

    // Use the new Create Agent API
    const agentResponse = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/agents`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.BEY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Interview Agent - ${interviewId}`,
        avatar_id: process.env.BEY_AVATAR_ID,
        system_prompt: systemPrompt || generateDefaultSystemPrompt(researchGoal),
        language: 'en',
        greeting: `Hello! I'm your AI interviewer. I'm here to learn about ${researchGoal || 'your experiences'}. I'm ready to begin our conversation whenever you are.`,
        max_session_length_minutes: 30,
        capabilities: [
          {
            type: 'webcam_vision'
          }
        ],
        llm: {
          type: 'openai'
        }
      })
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error('❌ BP Agent creation failed:', {
        status: agentResponse.status,
        errorText,
        avatarId: process.env.BEY_AVATAR_ID
      });
      throw new Error(`Failed to create BP Agent: ${agentResponse.status} - ${errorText}`);
    }

    const agent = await agentResponse.json();
    console.log('✅ BP Agent created successfully:', {
      id: agent.id,
      name: agent.name,
      avatarId: agent.avatar_id,
      language: agent.language,
      capabilities: agent.capabilities?.length || 0
    });

    // Store agent in memory
    const agentData = {
      agentId: agent.id,
      agent: agent,
      status: 'active',
      createdAt: Date.now()
    };

    activeAgents.set(interviewId, agentData);

    console.log("✅ BP Agent created and stored:", agentData);

    return NextResponse.json({
      agentId: agentData.agentId,
      agent: agentData.agent,
      status: agentData.status,
      createdAt: agentData.createdAt
    });

  } catch (error) {
    console.error("❌ Error creating BP Agent:", error);

    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;

      // Provide specific error messages
      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        errorMessage = "Invalid Beyond Presence credentials. Please verify BEY_API_KEY and BEY_AVATAR_ID.";
      } else if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
        errorMessage = "Beyond Presence avatar not found. Please verify BEY_AVATAR_ID.";
      } else if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        errorMessage = "Beyond Presence API access denied. Please verify BEY_API_KEY permissions.";
      }
    }

    return NextResponse.json(
      { error: `Failed to create BP Agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    if (!interviewId) {
      return NextResponse.json(
        { error: "interviewId parameter is required" },
        { status: 400 }
      );
    }

    const agentData = activeAgents.get(interviewId);
    if (!agentData) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      agentId: agentData.agentId,
      sessionId: agentData.sessionId,
      roomName: agentData.roomName,
      status: agentData.status,
      createdAt: agentData.createdAt,
      isReady: agentData.agent?.isReady() || false
    });

  } catch (error) {
    console.error("❌ Error getting BP Agent status:", error);
    return NextResponse.json(
      { error: "Failed to get agent status" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { interviewId } = await request.json();

    if (!interviewId) {
      return NextResponse.json(
        { error: "interviewId is required" },
        { status: 400 }
      );
    }

    const agentData = activeAgents.get(interviewId);
    if (!agentData) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Shutdown and cleanup agent
    if (agentData.agent) {
      await agentData.agent.shutdown();
    }

    // Remove from memory
    activeAgents.delete(interviewId);

    console.log("✅ BP Agent cleaned up:", interviewId);

    return NextResponse.json({
      message: "Agent cleaned up successfully",
      agentId: agentData.agentId
    });

  } catch (error) {
    console.error("❌ Error cleaning up BP Agent:", error);
    return NextResponse.json(
      { error: "Failed to cleanup agent" },
      { status: 500 }
    );
  }
}

/**
 * Generate default system prompt for interview agent
 */
function generateDefaultSystemPrompt(researchGoal?: string): string {
  const basePrompt = `You are an AI research interviewer conducting a qualitative interview. Your role is to:

1. Ask thoughtful, open-ended questions
2. Listen actively to responses
3. Ask follow-up questions to dig deeper
4. Maintain a professional, friendly tone
5. Keep the conversation flowing naturally

Guidelines:
- Ask one question at a time
- Wait for complete responses before asking follow-ups
- Use "tell me more about..." to encourage elaboration
- Avoid leading questions
- Be empathetic and non-judgmental`;

  if (researchGoal) {
    return `${basePrompt}

Research Goal: ${researchGoal}

Focus your questions on understanding this specific research goal. Tailor your questions to gather insights related to this topic.`;
  }

  return basePrompt;
}
