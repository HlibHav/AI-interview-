import { ensureBatchSummaryPersonalityProperty } from '@/lib/weaviate/weaviate-batch-summary';

async function main() {
  try {
    await ensureBatchSummaryPersonalityProperty();
    console.log('✅ Ensured BatchSummary.personalityProfileJson exists');
  } catch (error) {
    console.error('Failed to ensure BatchSummary.personalityProfileJson', error);
    process.exitCode = 1;
  }
}

void main();
