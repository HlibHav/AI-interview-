import { v5 as uuidv5 } from 'uuid';
import {
  createObjectWithReferences,
  ensureSchemaReference,
  getWeaviateClient,
  updateObjectWithReferences
} from './weaviate-helpers';

export type TranscriptChunkInput = {
  speaker: string;
  text: string;
  timestamp: string;
  summary?: string;
  keywords?: string[];
  sentiment?: string;
};

export async function upsertInterviewSession(session: any) {
  const weaviateClient = getWeaviateClient();

  console.log('🛰️ [WEAVIATE] Upserting InterviewSession', {
    sessionId: session.sessionId,
    status: session.status,
    transcriptEntries: Array.isArray(session.transcript) ? session.transcript.length : 0
  });

  const result = await weaviateClient.graphql
    .get()
    .withClassName('InterviewSession')
    .withFields('_additional { id } sessionId')
    .withWhere({
      path: ['sessionId'],
      operator: 'Equal',
      valueText: session.sessionId
    })
    .withLimit(1)
    .do();

  const existing = result.data?.Get?.InterviewSession?.[0];
  const sessionData = buildInterviewSessionPayload(session);

  if (existing?._additional?.id) {
    await updateObjectWithReferences(
      'InterviewSession',
      existing._additional.id,
      sessionData
    );
    console.log('✅ [WEAVIATE] Updated InterviewSession', {
      sessionId: session.sessionId,
      weaviateId: existing._additional.id
    });
    return existing._additional.id as string;
  }

  const created = await createObjectWithReferences('InterviewSession', sessionData);
  console.log('✅ [WEAVIATE] Created InterviewSession', {
    sessionId: session.sessionId,
    weaviateId: created.id
  });
  return created.id as string;
}

export function buildInterviewSessionPayload(session: any) {
  return {
    sessionId: session.sessionId,
    sessionUrl: session.sessionUrl,
    researchGoal: session.researchGoal || '',
    targetAudience: session.targetAudience || '',
    duration: session.duration || 30,
    sensitivity: session.sensitivity || 'low',
    participantEmail: session.participantEmail || '',
    participantName: session.participantName || '',
    roomName: session.roomName || '',
    beyondPresenceAgentId: session.beyondPresenceAgentId || '',
    beyondPresenceSessionId: session.beyondPresenceSessionId || '',
    status: session.status || 'completed',
    startTime: session.startTime || session.createdAt,
    endTime: session.endTime || new Date().toISOString(),
    durationMinutes: session.durationMinutes || 0,
    script: session.script ? JSON.stringify(session.script) : '',
    transcript: session.transcript ? JSON.stringify(session.transcript) : '',
    insights: session.summaries ? JSON.stringify(session.summaries) : '',
    psychometricProfile: session.psychometricProfile
      ? JSON.stringify(session.psychometricProfile)
      : '',
    keyFindings: session.keyFindings || [],
    summary: session.summary || '',
    createdAt: session.createdAt || new Date().toISOString(),
    updatedAt: session.updatedAt || new Date().toISOString(),
    createdBy: session.createdBy || 'system',
    tags: session.tags || [],
    isPublic: typeof session.isPublic === 'boolean' ? session.isPublic : false,
    accessCode: session.accessCode || ''
  };
}

export async function upsertInterviewChunks(
  sessionId: string,
  weaviateSessionId: string,
  entries: TranscriptChunkInput[]
) {
  let stored = 0;

  console.log('🛰️ [WEAVIATE] Upserting transcript chunks', {
    sessionId,
    entries: entries.length,
    weaviateSessionId
  });

  for (const entry of entries) {
    const chunkId = uuidv5(
      `${sessionId}:${entry.timestamp}:${entry.speaker}:${entry.text}`,
      uuidv5.URL
    );

    const chunkPayload = {
      sessionId,
      speaker: entry.speaker,
      text: entry.text,
      summary: entry.summary || '',
      keywords: entry.keywords || [],
      sentiment: entry.sentiment || 'neutral',
      timestamp: entry.timestamp
    };

    try {
      await createObjectWithReferences(
        'TranscriptChunk',
        chunkPayload,
        { session: weaviateSessionId },
        { id: chunkId }
      );
      stored += 1;
      console.log('✅ [WEAVIATE] Created TranscriptChunk', {
        chunkId,
        sessionId,
        speaker: entry.speaker
      });
      continue;
    } catch (error: any) {
      const message = error?.message || '';
      const missingSessionReference =
        message.includes("no such prop with name 'session'") ||
        message.includes('no such prop with name "session"') ||
        (message.includes('no such prop with name') &&
          message.includes('session') &&
          message.includes('TranscriptChunk'));

      if (missingSessionReference) {
        try {
          await ensureSchemaReference('TranscriptChunk', {
            name: 'session',
            targetClass: 'InterviewSession'
          });

          await createObjectWithReferences(
            'TranscriptChunk',
            chunkPayload,
            { session: weaviateSessionId },
            { id: chunkId }
          );
          stored += 1;
          console.log('✅ [WEAVIATE] Created TranscriptChunk after schema update', {
            chunkId,
            sessionId,
            speaker: entry.speaker
          });
          continue;
        } catch (schemaError: any) {
          console.warn(
            '⚠️ Failed to create interview chunk after ensuring reference:',
            schemaError
          );
        }
      }

      if (!message.includes('already exists')) {
        console.warn('⚠️ Failed to create interview chunk, attempting update:', error);
      }

      try {
        await updateObjectWithReferences(
          'TranscriptChunk',
          chunkId,
          chunkPayload,
          { session: weaviateSessionId }
        );
        stored += 1;
        console.log('✅ [WEAVIATE] Updated TranscriptChunk', {
          chunkId,
          sessionId
        });
      } catch (updateError) {
        console.error('❌ Failed to upsert interview chunk:', updateError);
      }
    }
  }

  if (stored > 0) {
    try {
      const count = await backfillTranscriptChunkReferences(sessionId, weaviateSessionId);
      console.log('✅ [WEAVIATE] Backfilled transcript references', {
        sessionId,
        updatedChunks: count
      });
    } catch (error) {
      console.warn('⚠️ [WEAVIATE] Failed to backfill transcript references:', error);
    }
  }

  return stored;
}

function parseJson(value: any) {
  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return undefined;
  }
}

export function parseInterviewSession(raw: any) {
  if (!raw) {
    return null;
  }

  const parsedSummaries =
    parseJson(raw.summaries) ??
    parseJson(raw.insights) ??
    raw.summaries ??
    raw.insights ??
    [];

  return {
    ...raw,
    script: parseJson(raw.script) ?? raw.script ?? null,
    transcript: parseJson(raw.transcript) ?? [],
    summaries: Array.isArray(parsedSummaries) ? parsedSummaries : [],
    psychometricProfile:
      parseJson(raw.psychometricProfile) ?? raw.psychometricProfile ?? null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    tags: raw.tags || [],
    isPublic: typeof raw.isPublic === 'boolean' ? raw.isPublic : false,
    accessCode: raw.accessCode || ''
  };
}

export async function fetchInterviewSession(sessionId: string) {
  const weaviateClient = getWeaviateClient();

  console.log('🔍 [WEAVIATE] Fetching InterviewSession', { sessionId });

  const result = await weaviateClient.graphql
    .get()
    .withClassName('InterviewSession')
    .withFields(`
      sessionId
      sessionUrl
      researchGoal
      targetAudience
      duration
      sensitivity
      participantEmail
      participantName
      roomName
      beyondPresenceAgentId
      beyondPresenceSessionId
      status
      startTime
      endTime
      durationMinutes
      script
      transcript
      summaries
      insights
      psychometricProfile
      keyFindings
      summary
      createdAt
      updatedAt
      createdBy
      tags
      isPublic
      accessCode
    `)
    .withWhere({
      path: ['sessionId'],
      operator: 'Equal',
      valueText: sessionId
    })
    .withLimit(1)
    .do();

  const session = result.data?.Get?.InterviewSession?.[0];
  if (!session) {
    console.warn('ℹ️ [WEAVIATE] InterviewSession not found', { sessionId });
  }
  return parseInterviewSession(session);
}

async function backfillTranscriptChunkReferences(
  sessionId: string,
  weaviateSessionId: string
) {
  const weaviateClient = getWeaviateClient();
  const limit = 100;
  let offset = 0;
  let totalUpdated = 0;

  for (;;) {
    const result = await weaviateClient.graphql
      .get()
      .withClassName('TranscriptChunk')
      .withFields(`
        _additional { id }
        sessionId
        speaker
        text
        summary
        keywords
        sentiment
        timestamp
      `)
      .withWhere({
        path: ['sessionId'],
        operator: 'Equal',
        valueText: sessionId
      })
      .withLimit(limit)
      .withOffset(offset)
      .do();

    const chunks = result.data?.Get?.TranscriptChunk ?? [];
    if (chunks.length === 0) {
      break;
    }

    for (const chunk of chunks) {
      const chunkId = chunk?._additional?.id;
      if (!chunkId) {
        continue;
      }

      const payload = {
        sessionId: chunk.sessionId || sessionId,
        speaker: chunk.speaker || '',
        text: chunk.text || '',
        summary: chunk.summary || '',
        keywords: Array.isArray(chunk.keywords) ? chunk.keywords : [],
        sentiment: chunk.sentiment || 'neutral',
        timestamp: chunk.timestamp
      };

      await updateObjectWithReferences(
        'TranscriptChunk',
        chunkId,
        payload,
        { session: weaviateSessionId }
      );
      totalUpdated += 1;
    }

    if (chunks.length < limit) {
      break;
    }

    offset += chunks.length;
  }

  return totalUpdated;
}
