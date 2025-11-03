import { loadEnvConfig } from '@next/env';
import { getWeaviateClient } from '@/lib/weaviate/weaviate-helpers';

loadEnvConfig(process.cwd());

async function main() {
  const client = getWeaviateClient();
  const res = await client.graphql
    .get()
    .withClassName('InterviewSession')
    .withFields(`sessionId researchGoal status _additional { id }`)
    .withLimit(200)
    .do();

  const rows: any[] = res?.data?.Get?.InterviewSession || [];
  rows
    .filter((row) => typeof row?.researchGoal === 'string' && row.researchGoal.toLowerCase().includes('math'))
    .forEach((row) => {
      console.log({
        sessionId: row?.sessionId,
        researchGoal: row?.researchGoal,
        status: row?.status,
        id: row?._additional?.id,
      });
    });
}

main().catch((error) => {
  console.error('Error dumping sessions:', error);
  process.exit(1);
});
