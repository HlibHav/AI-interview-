import { loadEnvConfig } from '@next/env';
import { canonicalizeGoalId } from '@/lib/weaviate/weaviate-utils';
import { getWeaviateClient } from '@/lib/weaviate/weaviate-helpers';

async function main() {
  loadEnvConfig(process.cwd());

  const goal = process.argv.slice(2).join(' ').trim();
  if (!goal) {
    console.error('Usage: tsx scripts/inspect-goal.ts "<research goal text>"');
    process.exit(1);
  }

  const client = getWeaviateClient();
  const canonical = canonicalizeGoalId(goal);

  console.log(`Inspecting Weaviate objects for research goal: "${goal}" (canonical "${canonical}")`);

  const sessions: Array<{ sessionId: string; objectId: string; researchGoal: string }> = [];
  const pageSize = 50;
  let offset = 0;

  while (true) {
    const res = await client.graphql
      .get()
      .withClassName('InterviewSession')
      .withFields(`
        sessionId
        researchGoal
        researchGoalRef: researchGoal { goalText _additional { id } }
        status
        _additional { id }
      `)
      .withLimit(pageSize)
      .withOffset(offset)
      .do();

    const rows: any[] = res?.data?.Get?.InterviewSession || [];
    if (rows.length === 0) break;

    for (const raw of rows) {
      const rawGoal =
        typeof raw?.researchGoal === 'string' && raw.researchGoal.trim().length > 0
          ? raw.researchGoal.trim()
          : Array.isArray(raw?.researchGoalRef) && raw.researchGoalRef.length > 0
            ? raw.researchGoalRef[0]?.goalText?.trim?.() ?? ''
            : '';
      if (!rawGoal) continue;
      if (canonicalizeGoalId(rawGoal) !== canonical) continue;

      const objectId = raw?._additional?.id || '';
      sessions.push({
        sessionId: raw?.sessionId || objectId,
        objectId,
        researchGoal: rawGoal
      });
    }

    if (rows.length < pageSize) {
      break;
    }
    offset += rows.length;
  }

  console.log(`Found ${sessions.length} InterviewSession objects:`);
  sessions.forEach((session) => {
    console.log(`- sessionId=${session.sessionId} objectId=${session.objectId} goal="${session.researchGoal}"`);
  });

  const batchRes = await client.graphql
    .get()
    .withClassName('BatchSummary')
    .withFields(`
      researchGoalId
      _additional { id }
    `)
    .withWhere({ path: ['researchGoalId'], operator: 'Like', valueText: goal })
    .withLimit(20)
    .do();

  const batchRows: any[] = batchRes?.data?.Get?.BatchSummary || [];
  console.log(`Found ${batchRows.length} BatchSummary objects:`);
  batchRows.forEach((row) => {
    console.log(`- batchId=${row?._additional?.id} researchGoalId="${row?.researchGoalId}"`);
  });

  const goalRes = await client.graphql
    .get()
    .withClassName('ResearchGoal')
    .withFields(`
      goalText
      targetAudience
      _additional { id }
    `)
    .withWhere({ path: ['goalText'], operator: 'Like', valueText: goal })
    .withLimit(20)
    .do();

  const goalRows: any[] = goalRes?.data?.Get?.ResearchGoal || [];
  console.log(`Found ${goalRows.length} ResearchGoal objects:`);
  goalRows.forEach((row) => {
    console.log(`- researchGoalId=${row?._additional?.id} goalText="${row?.goalText}"`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
