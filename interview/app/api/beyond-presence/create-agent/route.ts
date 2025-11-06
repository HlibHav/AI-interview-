import { NextRequest, NextResponse } from 'next/server';
import BeyondPresence from '@bey-dev/sdk';
import fs from 'fs';
import path from 'path';

function readEnvFileValue(fileName: string, key: string): string | undefined {
  try {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) {
      return undefined;
    }

    const fileContents = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of fileContents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) continue;

      const candidateKey = line.slice(0, separatorIndex).trim();
      if (candidateKey !== key) continue;

      const candidateValue = line.slice(separatorIndex + 1).trim();
      if (candidateValue.length === 0) continue;

      return candidateValue;
    }
  } catch (error) {
    console.warn(`[BEY] Failed to read ${key} from ${fileName}`, error);
  }
  return undefined;
}

function loadEnvValue(key: string): string | undefined {
  const fileValue =
    readEnvFileValue('.env.local', key) ?? readEnvFileValue('.env', key);

  if (fileValue && fileValue.trim().length > 0) {
    if (process.env[key] !== fileValue) {
      process.env[key] = fileValue;
    }
    return fileValue;
  }

  const existing = process.env[key];
  if (existing && existing.trim().length > 0) {
    return existing.trim();
  }

  return undefined;
}

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

    const beyApiKey = loadEnvValue('BEY_API_KEY');
    const beyAvatarId = loadEnvValue('BEY_AVATAR_ID');
    const beyApiUrl = loadEnvValue('BEY_API_URL');

    console.log('[BEY] create-agent config', {
      keyLoaded: Boolean(beyApiKey),
      keyPrefix: beyApiKey ? `${beyApiKey.slice(0, 8)}…` : 'missing',
      avatarLoaded: Boolean(beyAvatarId),
      avatarId: beyAvatarId,
      apiUrl: beyApiUrl || 'https://api.bey.dev (default)'
    });

    if (!beyApiKey) {
      throw new Error('BEY_API_KEY is not configured');
    }
    if (!beyAvatarId) {
      throw new Error('BEY_AVATAR_ID is not configured');
    }

    const client = new BeyondPresence({
      apiKey: beyApiKey,
      baseURL: beyApiUrl ? `${beyApiUrl.replace(/\/+$/, '')}/` : undefined,
    });

    const agent = await client.agent.create({
      name: name || 'AI Interview Agent',
      avatar_id: beyAvatarId,
      system_prompt: systemPrompt,
      language,
      greeting: greeting || 'Hello! I\'m your AI interviewer. I\'m ready to begin our conversation.',
      max_session_length_minutes: maxSessionLengthMinutes,
      capabilities: Array.isArray(capabilities) && capabilities.length > 0 ? capabilities : undefined,
    });
    console.log('✅ BP Agent created successfully:', {
      id: agent.id,
      name: agent.name,
      avatarId: agent.avatar_id,
      language: agent.language,
      capabilities: agent.capabilities?.length || 0
    });

    // Generate embed URL using https://bey.chat/{agentId} format (preferred by BEY API)
    const embedUrl = (agent as any)?.embed_url || `https://bey.chat/${agent.id}`;
    const conversationUrl = (agent as any)?.conversation_url || `https://bey.chat/${agent.id}`;

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
        llm,
        embedUrl,
        conversationUrl
      }
    };

    console.log('🔗 Final response data:', JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error creating BP Agent:', error);

    const statusCode =
      typeof error === 'object' && error !== null && 'status' in error && typeof (error as any).status === 'number'
        ? (error as any).status
        : 500;

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    if (statusCode === 503) {
      errorMessage = 'Beyond Presence service is temporarily unavailable. Please try again in a few moments.';
    } else if (statusCode === 401) {
      errorMessage = 'Invalid Beyond Presence credentials. Please verify BEY_API_KEY and BEY_AVATAR_ID.';
    } else if (statusCode === 404) {
      errorMessage = 'Beyond Presence avatar not found. Please verify BEY_AVATAR_ID.';
    } else if (statusCode === 403) {
      errorMessage = 'Beyond Presence API access denied. Please verify BEY_API_KEY permissions.';
    } else if (statusCode === 400) {
      errorMessage = 'Invalid request parameters. Please check your configuration.';
    }

    return NextResponse.json(
      { error: `Failed to create BP Agent: ${errorMessage}` },
      { status: statusCode || 500 }
    );
  }
}
