import { analyzeEmotionAndEnergy } from './emotion-detection';
import { detectContradictions, extractContradictionFlags } from './contradiction-detector';
import { categorizeNote } from './note-categorizer';
import { checkGuardrails, extractGuardrailFlags } from '@/lib/guardrails/content-monitor';
import type { TranscriptChunkInput } from '../weaviate/weaviate-session';

export type EnrichmentContext = {
  sessionId: string;
  researchGoal?: string;
  sensitivity?: 'low' | 'medium' | 'high';
  previousMood?: string;
  currentTopic?: string;
  turnIndex?: number;
};

export type EnrichedTranscriptChunk = TranscriptChunkInput & {
  emotionScore?: number;
  energyScore?: number;
  participantMood?: string;
  category?: string;
  contradictionFlags?: string[];
  guardrailTriggers?: string[];
};

/**
 * Enrich a transcript chunk with analysis results (emotion, contradiction, category, guardrails).
 * This runs all analysis modules in parallel for efficiency.
 */
export async function enrichTranscriptChunk(
  chunk: TranscriptChunkInput,
  context: EnrichmentContext
): Promise<EnrichedTranscriptChunk> {
  const enriched: EnrichedTranscriptChunk = { ...chunk };

  // Only analyze participant responses (not agent messages)
  if (chunk.speaker !== 'participant' && chunk.speaker !== 'user') {
    return enriched;
  }

  // Run all analyses in parallel for efficiency
  const [emotionResult, categoryResult, guardrailResult, contradictions] = await Promise.all([
    // Emotion and energy detection
    analyzeEmotionAndEnergy(chunk.text, {
      previousMood: context.previousMood,
      researchGoal: context.researchGoal,
      turnIndex: context.turnIndex
    }).catch((error) => {
      console.warn('[ENRICH] Emotion analysis failed:', error);
      return null;
    }),

    // Note categorization
    categorizeNote(chunk.text, {
      researchGoal: context.researchGoal
    }).catch((error) => {
      console.warn('[ENRICH] Category analysis failed:', error);
      return null;
    }),

    // Guardrail check
    checkGuardrails(chunk.text, {
      researchGoal: context.researchGoal,
      sensitivity: context.sensitivity || 'medium',
      currentTopic: context.currentTopic
    }).catch((error) => {
      console.warn('[ENRICH] Guardrail check failed:', error);
      return null;
    }),

    // Contradiction detection (only if we have a sessionId)
    context.sessionId
      ? detectContradictions(chunk.text, {
          sessionId: context.sessionId,
          excludeRecent: 5,
          limit: 10
        }).catch((error) => {
          console.warn('[ENRICH] Contradiction detection failed:', error);
          return [];
        })
      : Promise.resolve([])
  ]);

  // Apply emotion results
  if (emotionResult) {
    enriched.emotionScore = emotionResult.emotionScore;
    enriched.energyScore = emotionResult.energyScore;
    enriched.participantMood = emotionResult.participantMood;
    // Update sentiment if we have it
    if (emotionResult.sentiment && !enriched.sentiment) {
      enriched.sentiment = emotionResult.sentiment;
    }
  }

  // Apply category
  if (categoryResult) {
    enriched.category = categoryResult.category;
  }

  // Apply guardrail triggers
  if (guardrailResult && guardrailResult.triggered) {
    enriched.guardrailTriggers = extractGuardrailFlags(guardrailResult);
  }

  // Apply contradiction flags
  if (contradictions && contradictions.length > 0) {
    enriched.contradictionFlags = extractContradictionFlags(contradictions);
  }

  return enriched;
}

/**
 * Batch enrich multiple transcript chunks.
 * Processes in batches to avoid overwhelming the API.
 */
export async function batchEnrichTranscriptChunks(
  chunks: TranscriptChunkInput[],
  context: EnrichmentContext
): Promise<EnrichedTranscriptChunk[]> {
  const BATCH_SIZE = 3; // Smaller batches for analysis to avoid rate limits
  const enriched: EnrichedTranscriptChunk[] = [];
  let previousMood = context.previousMood;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (chunk, batchIndex) => {
        const enrichedChunk = await enrichTranscriptChunk(chunk, {
          ...context,
          previousMood,
          turnIndex: (context.turnIndex || 0) + i + batchIndex
        });

        // Update previous mood for next iteration
        if (enrichedChunk.participantMood) {
          previousMood = enrichedChunk.participantMood;
        }

        return enrichedChunk;
      })
    );

    enriched.push(...batchResults);
  }

  return enriched;
}

