import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, participantEmail, researchGoal } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Initialize Beyond Presence agent using the correct API
    const response = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/agents`, {
      method: "POST",
      headers: {
        "x-api-key": process.env.BEY_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Interview Agent ${sessionId}`,
        avatar_id: process.env.BEY_AVATAR_ID,
        system_prompt: `You are a professional user research interviewer conducting a qualitative research session. 
        Your goal is to understand user behavior, validate product ideas, assess product-market fit, and explore potential new features.
        
        Research Goal: ${researchGoal || "General user research and product validation"}
        
        Guidelines:
        1. Be warm, professional, and encouraging
        2. Ask open-ended questions to understand user motivations and pain points
        3. Use follow-up questions to dig deeper into interesting responses
        4. Avoid leading questions - let users express their genuine thoughts
        5. Be empathetic and make users feel comfortable sharing
        6. Focus on understanding the "why" behind user behaviors
        
        Start by introducing yourself and explaining the purpose of the research session.`,
        language: "en",
        greeting: "Hello! I'm your AI research interviewer. I'm here to learn about your experiences and preferences to help improve our products and services. Are you ready to begin?",
        max_session_length_minutes: 30,
        capabilities: [
          {
            type: "webcam_vision"
          }
        ],
        llm: {
          type: "openai"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Beyond Presence API error:", errorText);
      throw new Error(`Failed to initialize Beyond Presence agent: ${response.status}`);
    }

    const agentData = await response.json();

    return NextResponse.json({
      agentId: agentData.id,
      agentName: agentData.name,
      avatarId: agentData.avatar_id,
      status: "initialized",
      sessionId,
      greeting: agentData.greeting,
      capabilities: agentData.capabilities
    });

  } catch (error) {
    console.error("Error initializing Beyond Presence:", error);
    return NextResponse.json(
      { error: `Failed to initialize AI agent: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
