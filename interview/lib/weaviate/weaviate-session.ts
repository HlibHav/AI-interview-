import { v5 as uuidv5 } from 'uuid';
import {
  createObjectWithReferences,
  ensureSchemaClass,
  ensureSchemaReference,
  getWeaviateClient,
  updateObjectWithReferences
} from './weaviate-helpers';
import { generateEmbeddingForChunk } from '@/lib/embeddings/transcript';
import { 
  estimateTokens, 
  splitLongMessage, 
  validateChunkSize, 
  createChunkMetadata 
} from '@/lib/chunking';

export type TranscriptChunkInput = {
  speaker: string;
  text: string;
  timestamp: string;
  summary?: string;
  keywords?: string[];
  sentiment?: string;
  turnIndex?: number;
  embedding?: number[];
  // New fields for split chunk tracking
  partNumber?: number;
  totalParts?: number;
  originalMessageId?: string;
};

export type FullTranscriptEntry = {
  speaker: string;
  text: string;
  timestamp?: string;
  raw?: any;
};

export type TranscriptDocumentRecord = {
  sessionId: string;
  weaviateId: string | null;
  text: string;
  entries: FullTranscriptEntry[];
  messageCount: number;
  wordCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PsychometricProfileInput = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  enneagramType?: number;
  explanation: string;
  keyInsights?: string[];
  overallProfile?: string;
  createdAt?: string;
};

function normalizeTranscriptEntry(entry: any): FullTranscriptEntry | null {
  if (!entry) {
    return null;
  }

  const raw = entry.raw ?? entry;
  const text =
    typeof entry.text === 'string'
      ? entry.text
      : typeof entry.message === 'string'
        ? entry.message
        : typeof raw?.message === 'string'
          ? raw.message
          : typeof raw?.text === 'string'
            ? raw.text
            : '';

  if (!text || !text.trim()) {
    return null;
  }

  const speaker =
    entry.speaker ||
    entry.role ||
    entry.actor ||
    (raw?.sender === 'ai' ? 'agent' : raw?.sender === 'user' ? 'participant' : raw?.sender) ||
    (raw?.type === 'agent_message' ? 'agent' : 'participant') ||
    'unknown';

  const timestamp =
    entry.timestamp ||
    entry.time ||
    entry.sent_at ||
    raw?.sent_at ||
    raw?.timestamp ||
    raw?.createdAt ||
    raw?.created_at ||
    undefined;

  return {
    speaker,
    text: text.trim(),
    timestamp,
    raw
  };
}

export function normalizeTranscriptEntries(transcript: any): FullTranscriptEntry[] {
  if (!transcript) {
    return [];
  }

  if (typeof transcript === 'string') {
    const trimmed = transcript.trim();
    if (!trimmed) {
      return [];
    }

    return [
      {
        speaker: 'unknown',
        text: trimmed
      }
    ];
  }

  if (!Array.isArray(transcript)) {
    return normalizeTranscriptEntries([transcript]);
  }

  const entries: FullTranscriptEntry[] = [];
  transcript.forEach((item) => {
    const normalized = normalizeTranscriptEntry(item);
    if (normalized) {
      entries.push(normalized);
    }
  });

  return entries;
}

export function renderTranscriptText(entries: FullTranscriptEntry[]): string {
  return entries
    .map((entry) => {
      const timestamp = entry.timestamp ? `[${entry.timestamp}] ` : '';
      const speaker = entry.speaker || 'unknown';
      const text = entry.text || '';
      return `${timestamp}${speaker}: ${text}`.trim();
    })
    .filter((line) => line.length > 0)
    .join('\n');
}

function countWords(text: string): number {
  if (!text) {
    return 0;
  }
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function parseTranscriptJson(json: string | null | undefined): FullTranscriptEntry[] {
  if (!json || typeof json !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(json);
    return normalizeTranscriptEntries(parsed);
  } catch (error) {
    console.warn('[WEAVIATE] Failed to parse transcript JSON from TranscriptDocument:', error);
    return [];
  }
}

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
  let splitCount = 0;
  let totalTokensBefore = 0;
  let totalTokensAfter = 0;

  console.log('🛰️ [WEAVIATE] Upserting transcript chunks', {
    sessionId,
    entries: entries.length,
    weaviateSessionId
  });

  // Preprocess entries to handle long messages
  const processedEntries: TranscriptChunkInput[] = [];
  
  for (const entry of entries) {
    const tokens = estimateTokens(entry.text);
    totalTokensBefore += tokens;
    
    const validation = validateChunkSize(entry.text);
    
    if (validation.recommendation === 'split' && tokens > 200) {
      // Split long messages into semantic chunks
      const subChunks = splitLongMessage(entry);
      processedEntries.push(...subChunks);
      splitCount += subChunks.length - 1; // Track how many splits occurred
      
      console.log(`📝 [CHUNKING] Split long message (${tokens} tokens) into ${subChunks.length} parts`, {
        sessionId,
        originalLength: entry.text.length,
        splitParts: subChunks.length
      });
    } else {
      // Keep original message
      processedEntries.push(entry);
    }
  }

  // Calculate total tokens after processing
  totalTokensAfter = processedEntries.reduce((sum, entry) => sum + estimateTokens(entry.text), 0);

  console.log('📊 [CHUNKING] Processing statistics', {
    sessionId,
    originalEntries: entries.length,
    processedEntries: processedEntries.length,
    messagesSplit: splitCount,
    averageTokensBefore: Math.round(totalTokensBefore / entries.length),
    averageTokensAfter: Math.round(totalTokensAfter / processedEntries.length),
    totalTokensBefore,
    totalTokensAfter
  });

  for (const [index, entry] of processedEntries.entries()) {
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
      timestamp: entry.timestamp,
      turnIndex:
        typeof entry.turnIndex === 'number' && !Number.isNaN(entry.turnIndex)
          ? entry.turnIndex
          : index
    };

    const embedding =
      entry.embedding ??
      (await generateEmbeddingForChunk({
        speaker: entry.speaker,
        text: entry.text,
        summary: entry.summary,
        keywords: entry.keywords,
        // Pass split chunk metadata to embedding generation
        partNumber: entry.partNumber,
        totalParts: entry.totalParts,
        originalMessageId: entry.originalMessageId
      }));
    const createOptions = {
      id: chunkId,
      vector: embedding ?? undefined
    };

    try {
      await createObjectWithReferences(
        'TranscriptChunk',
        chunkPayload,
        { session: weaviateSessionId },
        createOptions
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
            createOptions
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
          { session: weaviateSessionId },
          embedding ? { vector: embedding } : undefined
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
      const count = await backfillTranscriptChunkReferences(sessionId, weaviateSessionId, {
        forceEmbedding: false
      });
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

export async function upsertTranscriptDocument(
  sessionId: string,
  weaviateSessionId: string,
  entries: FullTranscriptEntry[]
) {
  const weaviateClient = getWeaviateClient();
  const documentId = uuidv5(`${sessionId}:full-transcript`, uuidv5.URL);
  const nowIso = new Date().toISOString();

  const normalizedEntries = normalizeTranscriptEntries(entries);
  const plainText = renderTranscriptText(normalizedEntries);
  const wordCount = countWords(plainText);

  const documentPayload = {
    sessionId,
    text: plainText,
    json: JSON.stringify(normalizedEntries),
    messageCount: normalizedEntries.length,
    wordCount,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const updatePayload = {
    sessionId,
    text: plainText,
    json: documentPayload.json,
    messageCount: documentPayload.messageCount,
    wordCount: documentPayload.wordCount,
    updatedAt: nowIso
  };

  const reference = { session: weaviateSessionId };

  const attemptCreate = async () => {
    await createObjectWithReferences(
      'TranscriptDocument',
      documentPayload,
      reference,
      { id: documentId }
    );
  };

  try {
    await attemptCreate();
    console.log('✅ [WEAVIATE] Created TranscriptDocument', {
      sessionId,
      documentId
    });
    return documentId;
  } catch (error: any) {
    const message = error?.message || '';

    if (message.includes("has no class with name 'TranscriptDocument'")) {
      try {
        await ensureSchemaClass('TranscriptDocument');
        await attemptCreate();
        console.log('✅ [WEAVIATE] Created TranscriptDocument after ensuring class', {
          sessionId,
          documentId
        });
        return documentId;
      } catch (classError) {
        console.warn(
          '⚠️ Failed to create TranscriptDocument after ensuring class:',
          classError
        );
      }
    }

    const missingSessionReference =
      message.includes("no such prop with name 'session'") ||
      message.includes('no such prop with name "session"');

    if (missingSessionReference) {
      try {
        await ensureSchemaReference('TranscriptDocument', {
          name: 'session',
          targetClass: 'InterviewSession'
        });
        await attemptCreate();
        console.log('✅ [WEAVIATE] Created TranscriptDocument after schema update', {
          sessionId,
          documentId
        });
        return documentId;
      } catch (schemaError) {
        console.warn(
          '⚠️ Failed to create TranscriptDocument after ensuring reference:',
          schemaError
        );
      }
    }

    if (!message.includes('already exists')) {
      console.warn('⚠️ Failed to create TranscriptDocument, attempting update:', error);
    }
  }

  try {
    await updateObjectWithReferences(
      'TranscriptDocument',
      documentId,
      updatePayload,
      reference
    );
    console.log('✅ [WEAVIATE] Updated TranscriptDocument', {
      sessionId,
      documentId
    });
    return documentId;
  } catch (updateError) {
    console.error('❌ Failed to upsert TranscriptDocument:', updateError);
    return null;
  }
}

export async function fetchTranscriptDocument(
  sessionId: string
): Promise<TranscriptDocumentRecord | null> {
  const weaviateClient = getWeaviateClient();

  const result = await weaviateClient.graphql
    .get()
    .withClassName('TranscriptDocument')
    .withFields(`
      text
      json
      messageCount
      wordCount
      createdAt
      updatedAt
      _additional { id }
    `)
    .withWhere({
      path: ['sessionId'],
      operator: 'Equal',
      valueText: sessionId
    })
    .withLimit(1)
    .do();

  const document = result.data?.Get?.TranscriptDocument?.[0];
  if (!document) {
    return null;
  }

  let entries = parseTranscriptJson(document.json);
  const text = typeof document.text === 'string' ? document.text : renderTranscriptText(entries);

  if (entries.length === 0 && text) {
    entries = normalizeTranscriptEntries([{ text }]);
  }

  const messageCount =
    typeof document.messageCount === 'number' ? document.messageCount : entries.length;

  const wordCount =
    typeof document.wordCount === 'number' ? document.wordCount : countWords(text);

  return {
    sessionId,
    weaviateId: document?._additional?.id || null,
    text,
    entries,
    messageCount,
    wordCount,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

type TranscriptChunkRecord = {
  speaker?: string;
  text?: string;
  timestamp?: string;
  turnIndex?: number;
  raw?: Record<string, any>;
  order: number;
};

export async function fetchTranscriptChunks(
  sessionId: string,
  options?: { limit?: number }
): Promise<FullTranscriptEntry[]> {
  const weaviateClient = getWeaviateClient();
  const pageSize = 100;
  const requestedLimit = options?.limit ?? 2000;
  const chunks: TranscriptChunkRecord[] = [];
  let offset = 0;

  for (;;) {
    const batchLimit = Math.min(pageSize, requestedLimit - chunks.length);
    if (batchLimit <= 0) {
      break;
    }

    const result = await weaviateClient.graphql
      .get()
      .withClassName('TranscriptChunk')
      .withFields(`
        speaker
        text
        summary
        keywords
        sentiment
        timestamp
        turnIndex
      `)
      .withWhere({
        path: ['sessionId'],
        operator: 'Equal',
        valueText: sessionId
      })
      .withLimit(batchLimit)
      .withOffset(offset)
      .do();

    const records: Record<string, any>[] = result.data?.Get?.TranscriptChunk ?? [];
    if (records.length === 0) {
      break;
    }

    records.forEach((record, index) => {
      const turnIndex =
        typeof record?.turnIndex === 'number' && !Number.isNaN(record.turnIndex)
          ? record.turnIndex
          : undefined;

      chunks.push({
        speaker: record?.speaker,
        text: record?.text,
        timestamp: record?.timestamp,
        turnIndex,
        raw: record,
        order: offset + index
      });
    });

    offset += records.length;
    if (records.length < batchLimit) {
      break;
    }
  }

  const orderValue = (chunk: TranscriptChunkRecord) => {
    if (typeof chunk.turnIndex === 'number') {
      return chunk.turnIndex;
    }
    if (chunk.timestamp) {
      const ms = Date.parse(chunk.timestamp);
      if (!Number.isNaN(ms)) {
        return ms;
      }
    }
    return chunk.order;
  };

  const sorted = chunks
    .sort((a, b) => orderValue(a) - orderValue(b))
    .filter((chunk) => typeof chunk.text === 'string' && chunk.text.trim().length > 0);

  return sorted.map((chunk) => ({
    speaker: chunk.speaker || 'unknown',
    text: (chunk.text || '').trim(),
    timestamp: chunk.timestamp,
    raw: chunk.raw
  }));
}

export async function resolveWeaviateSessionId(sessionId: string): Promise<string | null> {
  const weaviateClient = getWeaviateClient();

  const result = await weaviateClient.graphql
    .get()
    .withClassName('InterviewSession')
    .withFields('_additional { id }')
    .withWhere({
      path: ['sessionId'],
      operator: 'Equal',
      valueText: sessionId
    })
    .withLimit(1)
    .do();

  return result.data?.Get?.InterviewSession?.[0]?._additional?.id || null;
}

export async function upsertPsychometricProfile(
  sessionId: string,
  profile: PsychometricProfileInput,
  providedWeaviateSessionId?: string | null
) {
  const weaviateClient = getWeaviateClient();
  const profileId = uuidv5(`${sessionId}:psychometric`, uuidv5.URL);
  const timestamp = profile.createdAt || new Date().toISOString();

  console.log('🧠 [WEAVIATE] Starting upsertPsychometricProfile:', {
    sessionId,
    profileId,
    providedWeaviateSessionId,
    profileScores: {
      openness: profile.openness,
      conscientiousness: profile.conscientiousness,
      extraversion: profile.extraversion,
      agreeableness: profile.agreeableness,
      neuroticism: profile.neuroticism,
      enneagramType: profile.enneagramType
    }
  });

  const payload = {
    sessionId,
    openness: profile.openness ?? 0,
    conscientiousness: profile.conscientiousness ?? 0,
    extraversion: profile.extraversion ?? 0,
    agreeableness: profile.agreeableness ?? 0,
    neuroticism: profile.neuroticism ?? 0,
    enneagramType: profile.enneagramType ?? 0,
    reasoning: profile.explanation,
    createdAt: timestamp
  };

  const ensureReference = async () => {
    try {
      console.log('🔗 [WEAVIATE] Ensuring PsychometricProfile.session reference...');
      await ensureSchemaReference('PsychometricProfile', {
        name: 'session',
        targetClass: 'InterviewSession'
      });
      console.log('✅ [WEAVIATE] PsychometricProfile.session reference ensured');
    } catch (error) {
      console.error('❌ [WEAVIATE] Failed ensuring PsychometricProfile.session reference:', error);
      throw error;
    }
  };

  const resolveReferenceId = async () => {
    const resolved = providedWeaviateSessionId || (await resolveWeaviateSessionId(sessionId));
    console.log('🔍 [WEAVIATE] Resolved reference ID:', {
      sessionId,
      providedWeaviateSessionId,
      resolved
    });
    return resolved;
  };

  const attemptCreate = async (referenceId: string | null) => {
    console.log('📝 [WEAVIATE] Attempting to create PsychometricProfile:', {
      profileId,
      referenceId,
      payloadKeys: Object.keys(payload)
    });
    
    await createObjectWithReferences(
      'PsychometricProfile',
      payload,
      referenceId ? { session: referenceId } : undefined,
      { id: profileId }
    );
  };

  let referenceId = await resolveReferenceId();

  try {
    await attemptCreate(referenceId);
    console.log('✅ [WEAVIATE] Created PsychometricProfile', {
      sessionId,
      profileId,
      referenceId
    });
    return profileId;
  } catch (error: any) {
    const message = error?.message || '';
    console.warn('⚠️ [WEAVIATE] Initial PsychometricProfile creation failed:', {
      sessionId,
      profileId,
      error: message,
      referenceId
    });

    if (message.includes("has no class with name 'PsychometricProfile'")) {
      try {
        console.log('🏗️ [WEAVIATE] Ensuring PsychometricProfile class exists...');
        await ensureSchemaClass('PsychometricProfile');
        referenceId = await resolveReferenceId();
        await attemptCreate(referenceId);
        console.log('✅ [WEAVIATE] Created PsychometricProfile after ensuring class', {
          sessionId,
          profileId,
          referenceId
        });
        return profileId;
      } catch (classError: any) {
        console.error('❌ [WEAVIATE] Failed to create PsychometricProfile after ensuring class:', {
          sessionId,
          profileId,
          error: classError?.message || classError,
          referenceId
        });
        throw classError;
      }
    }

    if (message.includes("no such prop with name 'session'")) {
      try {
        await ensureReference();
        referenceId = await resolveReferenceId();
        await attemptCreate(referenceId);
        console.log('✅ [WEAVIATE] Created PsychometricProfile after ensuring reference', {
          sessionId,
          profileId,
          referenceId
        });
        return profileId;
      } catch (referenceError: any) {
        console.error('❌ [WEAVIATE] Failed to create PsychometricProfile after ensuring reference:', {
          sessionId,
          profileId,
          error: referenceError?.message || referenceError,
          referenceId
        });
        throw referenceError;
      }
    }

    if (!message.includes('already exists')) {
      console.warn('⚠️ [WEAVIATE] Failed to create PsychometricProfile, attempting update:', {
        sessionId,
        profileId,
        error: message,
        referenceId
      });
    }
  }

  referenceId = referenceId || (await resolveReferenceId());

  try {
    console.log('🔄 [WEAVIATE] Attempting to update PsychometricProfile:', {
      sessionId,
      profileId,
      referenceId
    });
    
    await updateObjectWithReferences(
      'PsychometricProfile',
      profileId,
      payload,
      referenceId ? { session: referenceId } : undefined
    );
    console.log('✅ [WEAVIATE] Updated PsychometricProfile', {
      sessionId,
      profileId,
      referenceId
    });
    return profileId;
  } catch (updateError: any) {
    console.error('❌ [WEAVIATE] Failed to upsert PsychometricProfile:', {
      sessionId,
      profileId,
      error: updateError?.message || updateError,
      referenceId
    });
    throw updateError;
  }
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
    weaviateId: raw?._additional?.id || null,
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
      _additional { id }
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

async function fetchInterviewSessionByField(field: string, value: string) {
  const weaviateClient = getWeaviateClient();

  const result = await weaviateClient.graphql
    .get()
    .withClassName('InterviewSession')
    .withFields(`
      _additional { id }
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
      path: [field],
      operator: 'Equal',
      valueText: value
    })
    .withLimit(1)
    .do();

  const session = result.data?.Get?.InterviewSession?.[0];
  if (!session) {
    return null;
  }
  return parseInterviewSession(session);
}

export async function fetchInterviewSessionByBeyondPresenceSessionId(
  beyondPresenceSessionId: string
) {
  console.log('🔍 [WEAVIATE] Fetching InterviewSession by BEY session id', {
    beyondPresenceSessionId
  });
  return fetchInterviewSessionByField('beyondPresenceSessionId', beyondPresenceSessionId);
}

export async function backfillTranscriptChunkReferences(
  sessionId: string,
  weaviateSessionId: string,
  options?: { forceEmbedding?: boolean }
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
        _additional { id vector }
        sessionId
        speaker
        text
        summary
        keywords
        sentiment
        timestamp
        turnIndex
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

    for (const [chunkIndex, chunk] of chunks.entries()) {
      const chunkId = chunk?._additional?.id;
      if (!chunkId) {
        continue;
      }

      const turnIndex =
        typeof chunk.turnIndex === 'number' && !Number.isNaN(chunk.turnIndex)
          ? chunk.turnIndex
          : offset + chunkIndex;

      const payload = {
        sessionId: chunk.sessionId || sessionId,
        speaker: chunk.speaker || '',
        text: chunk.text || '',
        summary: chunk.summary || '',
        keywords: Array.isArray(chunk.keywords) ? chunk.keywords : [],
        sentiment: chunk.sentiment || 'neutral',
        timestamp: chunk.timestamp,
        turnIndex
      };

      const needsEmbedding = options?.forceEmbedding || !chunk?._additional?.vector;
      const embedding = needsEmbedding
        ? await generateEmbeddingForChunk({
            speaker: payload.speaker,
            text: payload.text,
            summary: payload.summary,
            keywords: payload.keywords
          })
        : undefined;

      await updateObjectWithReferences(
        'TranscriptChunk',
        chunkId,
        payload,
        { session: weaviateSessionId },
        embedding ? { vector: embedding } : undefined
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
