import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      systemPrompt, 
      language = 'en', 
      greeting, 
      maxSessionLengthMinutes = 30,
      capabilities = [],
      llm = { type: 'openai' }
    } = await request.json();

    console.log('🤖 Creating BP Agent via API route:', {
      name,
      hasSystemPrompt: !!systemPrompt,
      language,
      hasGreeting: !!greeting,
      maxSessionLengthMinutes,
      capabilities: capabilities.length,
      llmType: llm.type
    });

    // Validate required environment variables
    if (!process.env.BEY_API_KEY) {
      throw new Error('BEY_API_KEY is not configured');
    }
    if (!process.env.BEY_AVATAR_ID) {
      throw new Error('BEY_AVATAR_ID is not configured');
    }

    const response = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/agents`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.BEY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name || 'AI Interview Agent',
        avatar_id: process.env.BEY_AVATAR_ID,
        system_prompt: systemPrompt,
        language,
        greeting: greeting || 'Hello! I\'m your AI interviewer. I\'m ready to begin our conversation.',
        max_session_length_minutes: maxSessionLengthMinutes,
        capabilities: capabilities.length > 0 ? capabilities : [
          {
            type: 'webcam_vision'
          }
        ],
        llm
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ BP Agent creation failed:', {
        status: response.status,
        errorText,
        avatarId: process.env.BEY_AVATAR_ID
      });
      throw new Error(`Failed to create BP Agent: ${response.status} - ${errorText}`);
    }

    const agent = await response.json();
    console.log('✅ BP Agent created successfully:', {
      id: agent.id,
      name: agent.name,
      avatarId: agent.avatar_id,
      language: agent.language,
      capabilities: agent.capabilities?.length || 0
    });

    // Generate embed URL using the standard pattern
    const embedUrl = `https://app.bey.chat/embed/${agent.id}`;
    const conversationUrl = `https://app.bey.chat/conversation/${agent.id}`;

    console.log('🔗 Generated embed URL:', embedUrl);
    console.log('🔗 Generated conversation URL:', conversationUrl);
    console.log('🔗 Agent ID for URL generation:', agent.id);

    const responseData = {
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
        embedUrl,
        conversationUrl
      }
    };

    console.log('🔗 Final response data:', JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error creating BP Agent:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Invalid Beyond Presence credentials. Please verify BEY_API_KEY and BEY_AVATAR_ID.';
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        errorMessage = 'Beyond Presence avatar not found. Please verify BEY_AVATAR_ID.';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        errorMessage = 'Beyond Presence API access denied. Please verify BEY_API_KEY permissions.';
      }
    }

    return NextResponse.json(
      { error: `Failed to create BP Agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}