import { getWeaviateClient } from './weaviate-helpers';
import { generateEmbeddingForChunk } from '@/lib/embeddings/transcript';

export type MemorySearchResult = {
  chunkId: string;
  text: string;
  speaker: string;
  timestamp: string;
  turnIndex: number;
  similarity: number;
  summary?: string;
  keywords?: string[];
};

export type MemorySearchOptions = {
  sessionId?: string;
  limit?: number;
  minSimilarity?: number;
  excludeChunkIds?: string[];
  speaker?: string;
};

/**
 * Search for similar transcript chunks in the vector database.
 * This enables hierarchical memory - the agent can recall earlier statements
 * when needed (e.g., "earlier you said hiring was slow").
 */
export async function searchTranscriptMemory(
  query: string,
  options: MemorySearchOptions = {}
): Promise<MemorySearchResult[]> {
  const {
    sessionId,
    limit = 5,
    minSimilarity = 0.7,
    excludeChunkIds = [],
    speaker
  } = options;

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbeddingForChunk({
      text: query,
      speaker: 'system'
    });

    if (!queryEmbedding) {
      console.warn('[MEMORY] Failed to generate embedding for query:', query);
      return [];
    }

    const weaviateClient = getWeaviateClient();

    // Build where clause
    const whereClause: any = {};
    
    if (sessionId) {
      whereClause.operator = 'And';
      whereClause.operands = [
        {
          path: ['sessionId'],
          operator: 'Equal',
          valueText: sessionId
        }
      ];
    }

    if (speaker) {
      if (!whereClause.operands) {
        whereClause.operator = 'And';
        whereClause.operands = [];
      }
      whereClause.operands.push({
        path: ['speaker'],
        operator: 'Equal',
        valueText: speaker
      });
    }

    if (excludeChunkIds.length > 0) {
      if (!whereClause.operands) {
        whereClause.operator = 'And';
        whereClause.operands = [];
      }
      whereClause.operands.push({
        path: ['_additional', 'id'],
        operator: 'NotEqual',
        valueText: excludeChunkIds[0] // Weaviate supports single NotEqual, for multiple we'd need Or
      });
    }

    // If no conditions, use a simple where that always matches
    const finalWhere = Object.keys(whereClause).length > 0 ? whereClause : undefined;

    // Perform vector search
    const result = await weaviateClient.graphql
      .get()
      .withClassName('TranscriptChunk')
      .withFields(`
        _additional { 
          id 
          distance
        }
        sessionId
        turnIndex
        speaker
        text
        timestamp
        summary
        keywords
      `)
      .withNearVector({
        vector: queryEmbedding,
        certainty: minSimilarity
      })
      .withWhere(finalWhere)
      .withLimit(limit)
      .do();

    const chunks = result.data?.Get?.TranscriptChunk || [];

    // Convert to MemorySearchResult format
    const results: MemorySearchResult[] = chunks
      .filter((chunk: any) => {
        // Additional filtering for excluded IDs (handling multiple)
        if (excludeChunkIds.length > 0) {
          const chunkId = chunk._additional?.id;
          return !excludeChunkIds.includes(chunkId);
        }
        return true;
      })
      .map((chunk: any) => {
        // Convert distance to similarity (distance is typically 0-2 for cosine, similarity is 0-1)
        const distance = chunk._additional?.distance ?? 1;
        const similarity = Math.max(0, 1 - distance / 2); // Rough conversion for cosine distance

        return {
          chunkId: chunk._additional?.id || '',
          text: chunk.text || '',
          speaker: chunk.speaker || 'unknown',
          timestamp: chunk.timestamp || '',
          turnIndex: chunk.turnIndex ?? 0,
          similarity,
          summary: chunk.summary,
          keywords: chunk.keywords || []
        };
      })
      .filter((result: MemorySearchResult) => result.similarity >= minSimilarity)
      .sort((a: MemorySearchResult, b: MemorySearchResult) => b.similarity - a.similarity);

    console.log(`[MEMORY] Found ${results.length} similar chunks for query: "${query.substring(0, 50)}..."`);

    return results;
  } catch (error) {
    console.error('[MEMORY] Error searching transcript memory:', error);
    return [];
  }
}

/**
 * Search for specific statements or topics mentioned earlier in the interview.
 * Useful for long-range recall during conversation.
 */
export async function recallEarlierStatement(
  topic: string,
  sessionId: string,
  options: { limit?: number; excludeRecent?: number } = {}
): Promise<MemorySearchResult[]> {
  const { limit = 3, excludeRecent = 5 } = options;

  // Get recent chunk IDs to exclude
  let excludeChunkIds: string[] = [];
  if (excludeRecent > 0) {
    try {
      const weaviateClient = getWeaviateClient();
      const recentChunks = await weaviateClient.graphql
        .get()
        .withClassName('TranscriptChunk')
        .withFields('_additional { id } turnIndex')
        .withWhere({
          path: ['sessionId'],
          operator: 'Equal',
          valueText: sessionId
        })
        .withSort([{ path: ['turnIndex'], order: 'desc' }])
        .withLimit(excludeRecent)
        .do();

      excludeChunkIds =
        recentChunks.data?.Get?.TranscriptChunk?.map(
          (chunk: any) => chunk._additional?.id
        ).filter(Boolean) || [];
    } catch (error) {
      console.warn('[MEMORY] Failed to get recent chunks for exclusion:', error);
    }
  }

  return searchTranscriptMemory(topic, {
    sessionId,
    limit,
    excludeChunkIds,
    speaker: 'participant' // Usually we want to recall what the participant said
  });
}

