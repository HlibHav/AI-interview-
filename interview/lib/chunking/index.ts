/**
 * Chunking utilities for transcript processing
 * Provides intelligent text splitting and token estimation
 */

/**
 * Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
 * This is a simplified estimation - for production, consider using tiktoken
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  
  // Rough estimation: 1 token ≈ 4 characters for English text
  // This is conservative and works well for most cases
  return Math.ceil(text.trim().length / 4);
}

/**
 * Split text into sentences while preserving punctuation
 */
export function splitBySentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  // Split by sentence endings, but preserve the punctuation
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences;
}

/**
 * Split long message into semantic chunks with overlap
 */
export function splitLongMessage(
  entry: {
    speaker: string;
    text: string;
    timestamp: string;
    summary?: string;
    keywords?: string[];
    sentiment?: string;
    turnIndex?: number;
  },
  maxTokens: number = 200,
  overlapTokens: number = 25
): Array<{
  speaker: string;
  text: string;
  timestamp: string;
  summary?: string;
  keywords?: string[];
  sentiment?: string;
  turnIndex?: number;
  partNumber: number;
  totalParts: number;
  originalMessageId: string;
}> {
  const sentences = splitBySentences(entry.text);
  const chunks: any[] = [];
  
  if (sentences.length === 0) {
    return [];
  }
  
  let currentChunk = '';
  let currentTokens = 0;
  let partNumber = 1;
  const originalMessageId = `${entry.timestamp}:${entry.speaker}:${entry.text.substring(0, 50)}`;

  const buildChunk = (text: string, part: number) => {
    const chunk = {
      ...entry,
      text: text.trim(),
      partNumber: part,
      totalParts: 0, // Will be updated later
      originalMessageId
    };

    if ('embedding' in chunk) {
      delete (chunk as any).embedding;
    }

    return chunk;
  };
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokens(sentence);
    
    // If adding this sentence would exceed max tokens, finalize current chunk
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(buildChunk(currentChunk, partNumber));
      
      // Start new chunk with overlap from previous chunk
      const overlapText = getOverlapText(currentChunk, overlapTokens);
      currentChunk = overlapText + ' ' + sentence;
      currentTokens = estimateTokens(currentChunk);
      partNumber++;
    } else {
      // Add sentence to current chunk
      if (currentChunk.length > 0) {
        currentChunk += ' ' + sentence;
      } else {
        currentChunk = sentence;
      }
      currentTokens = estimateTokens(currentChunk);
    }
  }
  
  // Add final chunk if there's remaining content
  if (currentChunk.trim().length > 0) {
    chunks.push(buildChunk(currentChunk, partNumber));
  }
  
  // Update totalParts for all chunks
  const totalParts = chunks.length;
  chunks.forEach(chunk => {
    chunk.totalParts = totalParts;
  });
  
  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(/\s+/);
  const overlapWords = Math.ceil(overlapTokens * 0.75); // Convert tokens to words roughly
  
  if (words.length <= overlapWords) {
    return text;
  }
  
  return words.slice(-overlapWords).join(' ');
}

/**
 * Validate chunk size and provide recommendations
 */
export function validateChunkSize(text: string): {
  tokens: number;
  isValid: boolean;
  recommendation: 'keep' | 'split' | 'merge';
  reason: string;
} {
  const tokens = estimateTokens(text);
  
  if (tokens < 10) {
    return {
      tokens,
      isValid: false,
      recommendation: 'merge',
      reason: 'Chunk too short - may lack semantic context'
    };
  } else if (tokens > 300) {
    return {
      tokens,
      isValid: false,
      recommendation: 'split',
      reason: 'Chunk too long - may lose semantic coherence'
    };
  } else if (tokens > 200) {
    return {
      tokens,
      isValid: true,
      recommendation: 'split',
      reason: 'Chunk is long but acceptable - consider splitting for better embeddings'
    };
  } else {
    return {
      tokens,
      isValid: true,
      recommendation: 'keep',
      reason: 'Chunk size is optimal'
    };
  }
}

/**
 * Create chunk metadata for tracking and analysis
 */
export function createChunkMetadata(
  chunk: any,
  processingStats: {
    totalChunks: number;
    splitChunks: number;
    averageTokens: number;
  }
): {
  chunkId: string;
  processingStats: typeof processingStats;
  chunkMetrics: {
    tokens: number;
    words: number;
    characters: number;
    sentences: number;
  };
} {
  const tokens = estimateTokens(chunk.text);
  const words = chunk.text.split(/\s+/).length;
  const sentences = splitBySentences(chunk.text).length;
  
  return {
    chunkId: `${chunk.timestamp}:${chunk.speaker}:${tokens}`,
    processingStats,
    chunkMetrics: {
      tokens,
      words,
      characters: chunk.text.length,
      sentences
    }
  };
}
