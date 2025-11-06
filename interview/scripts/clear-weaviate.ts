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
      // First check if class exists
      try {
        await client.schema.classGetter().withClassName(className).do();
      } catch (classError) {
        console.log(`ℹ️ [WEAVIATE CLEAN] Class ${className} does not exist, skipping...`);
        continue;
      }

      console.log(`🧹 [WEAVIATE CLEAN] Clearing ${className} objects...`);
      
      // Fetch all object IDs first
      let allIds: string[] = [];
      let offset = 0;
      const limit = 100;
      
      while (true) {
        const result = await client.graphql
          .get()
          .withClassName(className)
          .withFields('_additional { id }')
          .withLimit(limit)
          .withOffset(offset)
          .do();
        
        const objects = result.data?.Get?.[className] || [];
        if (objects.length === 0) break;
        
        const ids = objects.map((obj: any) => obj._additional?.id).filter(Boolean);
        allIds.push(...ids);
        
        if (objects.length < limit) break;
        offset += limit;
      }
      
      if (allIds.length === 0) {
        console.log(`ℹ️ [WEAVIATE CLEAN] No objects found in ${className}`);
        continue;
      }
      
      console.log(`📊 [WEAVIATE CLEAN] Found ${allIds.length} objects in ${className}, deleting...`);
      
      // Delete objects in batches using individual deleters
      const batchSize = 100;
      for (let i = 0; i < allIds.length; i += batchSize) {
        const batch = allIds.slice(i, i + batchSize);
        
        // Delete each object individually in this batch
        const deletePromises = batch.map(id => 
          client.data
            .deleter()
            .withClassName(className)
            .withId(id)
            .do()
        );
        
        await Promise.all(deletePromises);
        console.log(`  ✓ Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} objects)`);
      }
      
      console.log(`✅ [WEAVIATE CLEAN] Deleted ${allIds.length} objects in ${className}`);
    } catch (error) {
      console.warn(
        `⚠️ [WEAVIATE CLEAN] Failed to purge ${className}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log('✨ [WEAVIATE CLEAN] Cleanup complete');
}

main().catch((error) => {
  console.error('❌ [WEAVIATE CLEAN] Unexpected error:', error);
  process.exitCode = 1;
});

