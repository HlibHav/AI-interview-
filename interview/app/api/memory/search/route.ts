import { NextRequest, NextResponse } from 'next/server';
import { searchTranscriptMemory, recallEarlierStatement } from '@/lib/weaviate/memory-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, sessionId, options = {} } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const results = await searchTranscriptMemory(query, {
      sessionId,
      limit: options.limit || 5,
      minSimilarity: options.minSimilarity || 0.7,
      excludeChunkIds: options.excludeChunkIds || [],
      speaker: options.speaker
    });

    return NextResponse.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('[API] Error in memory search:', error);
    return NextResponse.json(
      {
        error: 'Failed to search memory',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const sessionId = searchParams.get('sessionId');
    const topic = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const excludeRecent = parseInt(searchParams.get('excludeRecent') || '5', 10);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (topic) {
      // Use recallEarlierStatement for topic-based recall
      const results = await recallEarlierStatement(topic, sessionId, {
        limit,
        excludeRecent
      });

      return NextResponse.json({
        success: true,
        results,
        count: results.length
      });
    }

    if (!query) {
      return NextResponse.json(
        { error: 'query or topic parameter is required' },
        { status: 400 }
      );
    }

    const results = await searchTranscriptMemory(query, {
      sessionId,
      limit,
      minSimilarity: parseFloat(searchParams.get('minSimilarity') || '0.7'),
      speaker: searchParams.get('speaker') || undefined
    });

    return NextResponse.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('[API] Error in memory search:', error);
    return NextResponse.json(
      {
        error: 'Failed to search memory',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

