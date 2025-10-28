import 'dotenv/config';

import {
  backfillTranscriptChunkReferences,
  fetchInterviewSession,
  upsertTranscriptDocument
} from '../lib/weaviate/weaviate-session';
import { getWeaviateClient } from '../lib/weaviate/weaviate-helpers';

type SessionReference = {
  sessionId: string;
  weaviateId: string;
};

async function fetchAllSessions(): Promise<SessionReference[]> {
  const client = getWeaviateClient();
  const limit = 100;
  let offset = 0;
  const sessions: SessionReference[] = [];

  for (;;) {
    const result = await client.graphql
      .get()
      .withClassName('InterviewSession')
      .withFields('_additional { id } sessionId')
      .withLimit(limit)
      .withOffset(offset)
      .do();

    const batch = result.data?.Get?.InterviewSession ?? [];
    if (batch.length === 0) {
      break;
    }

    for (const item of batch) {
      const sessionId = item?.sessionId;
      const weaviateId = item?._additional?.id;

      if (sessionId && weaviateId) {
        sessions.push({ sessionId, weaviateId });
      }
    }

    if (batch.length < limit) {
      break;
    }

    offset += batch.length;
  }

  return sessions;
}

async function backfillSessions(sessions: SessionReference[]) {
  let processed = 0;

  for (const session of sessions) {
    processed += 1;
    console.log(
      `🔁 Backfilling transcript chunks (${processed}/${sessions.length}) for session ${session.sessionId}`
    );

    try {
      const sessionData = await fetchInterviewSession(session.sessionId);

      if (sessionData?.transcript && Array.isArray(sessionData.transcript)) {
        await upsertTranscriptDocument(session.sessionId, session.weaviateId, sessionData.transcript);
      }

      const updated = await backfillTranscriptChunkReferences(session.sessionId, session.weaviateId, {
        forceEmbedding: true
      });
      console.log(
        `✅ Completed session ${session.sessionId} — updated ${updated} transcript chunks`
      );
    } catch (error) {
      console.error(
        `❌ Failed to backfill session ${session.sessionId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
}

async function main() {
  console.log('📦 Gathering InterviewSession objects from Weaviate…');
  const sessions = await fetchAllSessions();

  if (sessions.length === 0) {
    console.log('ℹ️ No InterviewSession records found. Nothing to backfill.');
    return;
  }

  console.log(`📈 Found ${sessions.length} InterviewSession records.`);
  await backfillSessions(sessions);
  console.log('🎉 Backfill run complete.');
}

main().catch((error) => {
  console.error('❌ Backfill run failed:', error);
  process.exitCode = 1;
});
