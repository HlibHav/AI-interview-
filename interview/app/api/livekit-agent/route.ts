// app/api/livekit-agent/route.ts
// LiveKit Agent API using Beyond Presence plugin patterns

import { NextRequest, NextResponse } from "next/server";
import { createLiveKitBPAgentService, createAgentConfigFromEnv } from "../../lib/livekit-bp-agent-service";

// In-memory agent tracking (in production, use a database)
const activeAgents = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { 
      roomName, 
      agentIdentity,
      researchGoal, 
      interviewScript,
      systemPrompt,
      action = 'create' // create, start, stop, status
    } = await request.json();

    console.log("🤖 LiveKit Agent API request:", {
      action,
      roomName,
      agentIdentity,
      hasResearchGoal: !!researchGoal,
      hasScript: !!interviewScript
    });

    // Validate required environment variables
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
    }
    if (!process.env.BEY_API_KEY || !process.env.BEY_AVATAR_ID) {
      throw new Error("BEY_API_KEY and BEY_AVATAR_ID must be set");
    }
    if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
      throw new Error("NEXT_PUBLIC_LIVEKIT_URL must be set");
    }

    const agentKey = `${roomName}-${agentIdentity}`;

    switch (action) {
      case 'create':
        return await createAgent(agentKey, roomName, agentIdentity, researchGoal, interviewScript, systemPrompt);
      
      case 'start':
        return await startAgent(agentKey);
      
      case 'stop':
        return await stopAgent(agentKey);
      
      case 'status':
        return await getAgentStatus(agentKey);
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("❌ Error in LiveKit Agent API:", error);

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
      { error: `LiveKit Agent API error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function createAgent(
  agentKey: string,
  roomName: string,
  agentIdentity: string,
  researchGoal?: string,
  interviewScript?: any,
  systemPrompt?: string
) {
  // Check if agent already exists
  if (activeAgents.has(agentKey)) {
    const existing = activeAgents.get(agentKey);
    const ageMinutes = (Date.now() - existing.createdAt) / (1000 * 60);
    
    if (ageMinutes < 30) {
      console.log(`🔄 Returning existing agent for ${agentKey}`);
      return NextResponse.json({
        agentKey,
        status: existing.agent.getStatus(),
        createdAt: existing.createdAt,
        message: "Agent already exists"
      });
    } else {
      // Remove expired agent
      await existing.agent.shutdown();
      activeAgents.delete(agentKey);
    }
  }

  try {
    // Create agent configuration
    const config = createAgentConfigFromEnv(
      roomName,
      agentIdentity,
      researchGoal,
      interviewScript,
      systemPrompt
    );

    console.log("🔧 Creating LiveKit BP Agent Service:", {
      roomName: config.roomName,
      agentIdentity: config.agentIdentity,
      hasSystemPrompt: !!config.systemPrompt,
      hasScript: !!config.interviewScript
    });

    // Create the agent service
    const agent = await createLiveKitBPAgentService(config);

    // Store agent in memory
    const agentData = {
      agentKey,
      agent,
      createdAt: Date.now(),
      config
    };

    activeAgents.set(agentKey, agentData);

    console.log("✅ LiveKit BP Agent Service created:", agentKey);

    return NextResponse.json({
      agentKey,
      status: agent.getStatus(),
      createdAt: agentData.createdAt,
      message: "Agent created successfully"
    });

  } catch (error) {
    console.error("❌ Failed to create agent:", error);
    throw error;
  }
}

async function startAgent(agentKey: string) {
  const agentData = activeAgents.get(agentKey);
  if (!agentData) {
    return NextResponse.json(
      { error: "Agent not found" },
      { status: 404 }
    );
  }

  try {
    await agentData.agent.start();
    console.log("🚀 Agent started:", agentKey);

    return NextResponse.json({
      agentKey,
      status: agentData.agent.getStatus(),
      message: "Agent started successfully"
    });

  } catch (error) {
    console.error("❌ Failed to start agent:", error);
    throw error;
  }
}

async function stopAgent(agentKey: string) {
  const agentData = activeAgents.get(agentKey);
  if (!agentData) {
    return NextResponse.json(
      { error: "Agent not found" },
      { status: 404 }
    );
  }

  try {
    await agentData.agent.shutdown();
    activeAgents.delete(agentKey);
    console.log("🛑 Agent stopped:", agentKey);

    return NextResponse.json({
      agentKey,
      message: "Agent stopped successfully"
    });

  } catch (error) {
    console.error("❌ Failed to stop agent:", error);
    throw error;
  }
}

async function getAgentStatus(agentKey: string) {
  const agentData = activeAgents.get(agentKey);
  if (!agentData) {
    return NextResponse.json(
      { error: "Agent not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    agentKey,
    status: agentData.agent.getStatus(),
    createdAt: agentData.createdAt,
    isReady: agentData.agent.isReady()
  });
}

// Handle GET requests for agent status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentKey = searchParams.get('agentKey');

    if (!agentKey) {
      return NextResponse.json(
        { error: "agentKey parameter is required" },
        { status: 400 }
      );
    }

    return await getAgentStatus(agentKey);

  } catch (error) {
    console.error("❌ Error getting agent status:", error);
    return NextResponse.json(
      { error: "Failed to get agent status" },
      { status: 500 }
    );
  }
}

// Handle DELETE requests for agent cleanup
export async function DELETE(request: NextRequest) {
  try {
    const { agentKey } = await request.json();

    if (!agentKey) {
      return NextResponse.json(
        { error: "agentKey is required" },
        { status: 400 }
      );
    }

    return await stopAgent(agentKey);

  } catch (error) {
    console.error("❌ Error deleting agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}
