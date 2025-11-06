import { searchTranscriptMemory, MemorySearchResult } from '@/lib/weaviate/memory-search';
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return openaiClient;
}

export type ContradictionResult = {
  hasContradiction: boolean;
  conflictScore: number; // 0-1, where 1 = strong contradiction
  contradictionId: string; // Unique ID for this contradiction
  earlierStatement: string;
  earlierChunkId: string;
  earlierTurnIndex: number;
  newStatement: string;
  explanation: string;
  suggestedClarification?: string;
};

export type ContradictionDetectionOptions = {
  sessionId: string;
  threshold?: number; // Default 0.7
  excludeRecent?: number; // Number of recent turns to exclude from comparison
  limit?: number; // Max number of earlier statements to check
};

/**
 * Detect contradictions by comparing new statements against earlier claims.
 * Uses vector similarity to find potentially conflicting statements, then
 * uses an LLM to assess semantic contradiction.
 */
export async function detectContradictions(
  newStatement: string,
  options: ContradictionDetectionOptions
): Promise<ContradictionResult[]> {
  const {
    sessionId,
    threshold = 0.7,
    excludeRecent = 5,
    limit = 10
  } = options;

  if (!sessionId) {
    throw new Error('sessionId is required for contradiction detection');
  }

  try {
    // First, search for semantically similar statements from earlier in the conversation
    const similarStatements = await searchTranscriptMemory(newStatement, {
      sessionId,
      limit,
      minSimilarity: 0.5, // Lower threshold for initial search
      speaker: 'participant' // Usually comparing participant statements
    });

    if (similarStatements.length === 0) {
      return [];
    }

    // Filter out recent statements
    const recentTurnIndex = similarStatements[0]?.turnIndex || 0;
    const earlierStatements = similarStatements.filter(
      (stmt) => stmt.turnIndex < recentTurnIndex - excludeRecent
    );

    if (earlierStatements.length === 0) {
      return [];
    }

    // Use LLM to assess contradictions
    const client = getOpenAIClient();
    if (!client) {
      console.warn('[CONTRADICTION] OpenAI not available, skipping semantic analysis');
      return [];
    }

    const contradictions: ContradictionResult[] = [];

    // Check each earlier statement for contradiction
    for (const earlierStmt of earlierStatements.slice(0, 5)) {
      // Limit to top 5 to avoid too many API calls
      const contradiction = await assessContradiction(
        newStatement,
        earlierStmt,
        client
      );

      if (contradiction && contradiction.conflictScore >= threshold) {
        contradictions.push(contradiction);
      }
    }

    return contradictions.sort((a, b) => b.conflictScore - a.conflictScore);
  } catch (error) {
    console.error('[CONTRADICTION] Error detecting contradictions:', error);
    return [];
  }
}

async function assessContradiction(
  newStatement: string,
  earlierStatement: MemorySearchResult,
  client: OpenAI
): Promise<ContradictionResult | null> {
  try {
    const systemPrompt = `You are an expert at detecting contradictions and inconsistencies in conversation.
Compare the new statement with the earlier statement and determine if they contradict each other.

A contradiction occurs when:
- The statements directly conflict (e.g., "I love X" vs "I hate X")
- The statements are logically inconsistent (e.g., "I never do Y" vs "I always do Y")
- The statements contradict on facts (e.g., "I worked at Company A in 2020" vs "I worked at Company B in 2020")

NOT contradictions:
- Elaboration or clarification (e.g., "I like X" -> "I like X because Y")
- Evolution of opinion (e.g., "I thought X" -> "Now I think Y")
- Different contexts or time periods

Return only valid JSON in this exact format:
{
  "hasContradiction": boolean,
  "conflictScore": 0.0-1.0,
  "explanation": "brief explanation",
  "suggestedClarification": "optional clarifying question"
}`;

    const userPrompt = `Earlier statement (turn ${earlierStatement.turnIndex}):
"${earlierStatement.text}"

New statement:
"${newStatement}"

Analyze if these statements contradict each other.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content) as {
      hasContradiction: boolean;
      conflictScore: number;
      explanation: string;
      suggestedClarification?: string;
    };

    if (!parsed.hasContradiction) {
      return null;
    }

    // Generate unique contradiction ID
    const contradictionId = `contradiction-${earlierStatement.chunkId}-${Date.now()}`;

    return {
      hasContradiction: true,
      conflictScore: Math.max(0, Math.min(1, parsed.conflictScore ?? 0.5)),
      contradictionId,
      earlierStatement: earlierStatement.text,
      earlierChunkId: earlierStatement.chunkId,
      earlierTurnIndex: earlierStatement.turnIndex,
      newStatement,
      explanation: parsed.explanation || 'Contradiction detected',
      suggestedClarification: parsed.suggestedClarification
    };
  } catch (error) {
    console.error('[CONTRADICTION] Error assessing contradiction:', error);
    return null;
  }
}

/**
 * Get contradiction flags as an array of IDs for storage in transcript chunk.
 */
export function extractContradictionFlags(contradictions: ContradictionResult[]): string[] {
  return contradictions.map((c) => c.contradictionId);
}

