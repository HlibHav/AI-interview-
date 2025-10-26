import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Retrieving BP Agent details:', { agentId });

    // Validate required environment variables
    if (!process.env.BEY_API_KEY) {
      throw new Error('BEY_API_KEY is not configured');
    }

    const response = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/agents/${agentId}`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.BEY_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ BP Agent retrieval failed:', {
        status: response.status,
        errorText,
        agentId
      });
      throw new Error(`Failed to retrieve BP Agent: ${response.status} - ${errorText}`);
    }

    const agent = await response.json();
    console.log('✅ BP Agent retrieved successfully:', {
      id: agent.id,
      name: agent.name,
      hasEmbedUrl: !!agent.embed_url,
      hasConversationUrl: !!agent.conversation_url
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        avatarId: agent.avatar_id,
        systemPrompt: agent.system_prompt,
        language: agent.language,
        greeting: agent.greeting,
        maxSessionLengthMinutes: agent.max_session_length_minutes,
        capabilities: agent.capabilities,
        llm: agent.llm,
        embedUrl: agent.embed_url,
        conversationUrl: agent.conversation_url,
        url: agent.url
      }
    });

  } catch (error) {
    console.error('❌ Error retrieving BP Agent:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: `Failed to retrieve BP Agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}
