import OpenAI from 'openai';

type EmbeddingInput = {
  speaker?: string;
  text?: string;
  summary?: string;
  keywords?: string[];
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
  }

  if (input.summary) {
    parts.push(`Summary: ${input.summary}`);
  }

  if (input.keywords && input.keywords.length > 0) {
    parts.push(`Keywords: ${input.keywords.join(', ')}`);
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
