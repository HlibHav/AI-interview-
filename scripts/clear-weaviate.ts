import 'dotenv/config';
import weaviate, { ApiKey } from 'weaviate-ts-client';

const CLASSES_TO_CLEAR = [
  'InterviewSession',
  'InterviewPlaybook',
  'QuestionPlan',
  'TranscriptChunk',
  'TranscriptDocument',
  'Annotation',
  'PsychometricProfile',
  'BatchSummary',
  'BatchSummaryTombstone',
  'ResearchGoal',
];

async function main() {
  const host = process.env.WEAVIATE_HOST || 'localhost:8080';
  const scheme =
    host.includes('.weaviate.cloud') || host.includes('.weaviate.network')
      ? 'https'
      : 'http';

  const apiKeyValue = process.env.WEAVIATE_API_KEY;

  const client = weaviate.client({
    scheme,
    host,
    ...(apiKeyValue ? { apiKey: new ApiKey(apiKeyValue) } : {}),
  });

  for (const className of CLASSES_TO_CLEAR) {
    try {
      console.log(`🧹 [WEAVIATE CLEAN] Clearing ${className} objects...`);
      await client.batch
        .objectsBatchDeleter()
        .withClassName(className)
        .withWhere({
          operator: 'GreaterThan',
          path: ['_creationTimeUnix'],
          valueNumber: 0,
        })
        .do();
      console.log(`✅ [WEAVIATE CLEAN] Deleted objects in ${className}`);
    } catch (error) {
      console.warn(
        `⚠️ [WEAVIATE CLEAN] Failed to purge ${className}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log('✨ [WEAVIATE CLEAN] Cleanup complete');
}

main().catch((error) => {
  console.error('❌ [WEAVIATE CLEAN] Unexpected error:', error);
  process.exitCode = 1;
});
