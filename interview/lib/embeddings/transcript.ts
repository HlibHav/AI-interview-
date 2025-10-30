import OpenAI from 'openai';

type EmbeddingInput = {
  speaker?: string;
  text?: string;
  summary?: string;
  keywords?: string[];
  // New fields for split chunk metadata
  partNumber?: number;
  totalParts?: number;
  originalMessageId?: string;
};

let openAIClient: OpenAI | null = null;
let warnedMissingApiKey = false;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    if (!warnedMissingApiKey) {
      console.warn(
        '[EMBEDDINGS] OPENAI_API_KEY not set; skipping embedding generation for transcript chunks.'
      );
      warnedMissingApiKey = true;
    }
    return null;
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return openAIClient;
}

function buildEmbeddingPrompt(input: EmbeddingInput): string | null {
  const parts: string[] = [];

  if (input.speaker) {
    parts.push(`Speaker: ${input.speaker}`);
  }

  if (input.text) {
    parts.push(`Utterance: ${input.text}`);
    
    // Add context hints for short messages
    const textLength = input.text.trim().length;
    if (textLength < 50) {
      parts.push(`Context: Brief ${input.speaker} response in interview`);
    }
    
    // Add conversation type indicators
    if (input.text.includes('?')) {
      parts.push(`Type: Question requiring response`);
    } else if (input.speaker === 'participant' || input.speaker === 'user') {
      parts.push(`Type: User response/answer`);
    } else if (input.speaker === 'agent' || input.speaker === 'ai') {
      parts.push(`Type: AI interviewer statement`);
    }
  }

  if (input.summary) {
    parts.push(`Summary: ${input.summary}`);
  }

  if (input.keywords && input.keywords.length > 0) {
    parts.push(`Keywords: ${input.keywords.join(', ')}`);
  }

  // Add split chunk metadata when present
  if (input.partNumber && input.totalParts) {
    parts.push(`Chunk: Part ${input.partNumber} of ${input.totalParts} (split message)`);
    if (input.originalMessageId) {
      parts.push(`Original: ${input.originalMessageId.substring(0, 50)}...`);
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join('\n');
}

export async function generateEmbeddingForChunk(input: EmbeddingInput): Promise<number[] | null> {
  const prompt = buildEmbeddingPrompt(input);
  if (!prompt) {
    return null;
  }

  const client = getOpenAIClient();
  if (!client) {
    return null;
  }

  try {
    const response = await client.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
      input: prompt
    });

    return response.data[0]?.embedding ?? null;
  } catch (error) {
    console.warn('[EMBEDDINGS] Failed to generate embedding for transcript chunk:', error);
    return null;
  }
}
