import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const speaker = searchParams.get('speaker');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId parameter is required',
      }, { status: 400 });
    }

    // Build where clause
    let whereConditions = [`{ path: ["sessionId"], operator: Equal, valueText: "${sessionId}" }`];
    if (speaker) {
      whereConditions.push(`{ path: ["speaker"], operator: Equal, valueText: "${speaker}" }`);
    }

    const whereClause = `where: { operator: And, operands: [${whereConditions.join(', ')}] }`;

    const query = {
      query: `
        {
          Get {
            TranscriptChunk(limit: ${limit}, ${whereClause}) {
              chunkId
              sessionId
              speaker
              text
              timestamp
              questionId
              topic
              sentiment
              confidence
              _additional {
                id
              }
            }
          }
        }
      `
    };

    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${weaviateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`Weaviate request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return NextResponse.json({
      success: true,
      chunks: result.data?.Get?.TranscriptChunk || [],
    });
  } catch (error) {
    console.error('Error fetching transcript chunks:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const chunkData = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Generate a UUID for the chunk if not provided
    const chunkId = chunkData.chunkId || crypto.randomUUID();

    const objectData = {
      class: 'TranscriptChunk',
      properties: {
        chunkId,
        sessionId: chunkData.sessionId || '',
        speaker: chunkData.speaker || 'respondent',
        text: chunkData.text || '',
        timestamp: chunkData.timestamp || new Date().toISOString(),
        questionId: chunkData.questionId || '',
        topic: chunkData.topic || '',
        sentiment: chunkData.sentiment || 'neutral',
        confidence: chunkData.confidence || 0.5,
      },
    };

    const response = await fetch(`${baseUrl}/objects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${weaviateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(objectData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create transcript chunk: ${error}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      chunkId,
      objectId: result.id,
    });
  } catch (error) {
    console.error('Error creating transcript chunk:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Semantic search for RAG retrieval
export async function PUT(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { query, sessionId, limit = 5 } = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    const searchQuery = {
      query: `
        {
          Get {
            TranscriptChunk(
              nearText: {
                concepts: ["${query}"]
              }
              where: { path: ["sessionId"], operator: Equal, valueText: "${sessionId}" }
              limit: ${limit}
            ) {
              chunkId
              sessionId
              speaker
              text
              timestamp
              questionId
              topic
              sentiment
              confidence
              _additional {
                id
                distance
              }
            }
          }
        }
      `
    };

    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${weaviateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchQuery),
    });

    if (!response.ok) {
      throw new Error(`Weaviate request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return NextResponse.json({
      success: true,
      chunks: result.data?.Get?.TranscriptChunk || [],
    });
  } catch (error) {
    console.error('Error searching transcript chunks:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
