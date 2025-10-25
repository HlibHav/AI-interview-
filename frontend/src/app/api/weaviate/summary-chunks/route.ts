import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId parameter is required',
      }, { status: 400 });
    }

    const query = {
      query: `
        {
          Get {
            SummaryChunk(
              where: { path: ["sessionId"], operator: Equal, valueText: "${sessionId}" }
              limit: ${limit}
            ) {
              summaryId
              sessionId
              chunkId
              summary
              keywords
              keyInsights
              painPoints
              featureRequests
              createdAt
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
      summaries: result.data?.Get?.SummaryChunk || [],
    });
  } catch (error) {
    console.error('Error fetching summary chunks:', error);
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
    
    const summaryData = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Generate a UUID for the summary if not provided
    const summaryId = summaryData.summaryId || crypto.randomUUID();

    const objectData = {
      class: 'SummaryChunk',
      properties: {
        summaryId,
        sessionId: summaryData.sessionId || '',
        chunkId: summaryData.chunkId || '',
        summary: summaryData.summary || '',
        keywords: summaryData.keywords || [],
        keyInsights: summaryData.keyInsights || [],
        painPoints: summaryData.painPoints || [],
        featureRequests: summaryData.featureRequests || [],
        createdAt: summaryData.createdAt || new Date().toISOString(),
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
      throw new Error(`Failed to create summary chunk: ${error}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      summaryId,
      objectId: result.id,
    });
  } catch (error) {
    console.error('Error creating summary chunk:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Aggregate insights across all summaries for a session
export async function PUT(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { sessionId } = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    const query = {
      query: `
        {
          Get {
            SummaryChunk(
              where: { path: ["sessionId"], operator: Equal, valueText: "${sessionId}" }
            ) {
              keyInsights
              painPoints
              featureRequests
              keywords
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

    const summaries = result.data?.Get?.SummaryChunk || [];
    
    // Aggregate insights
    const aggregatedInsights = {
      allKeyInsights: summaries.flatMap(s => s.keyInsights || []),
      allPainPoints: summaries.flatMap(s => s.painPoints || []),
      allFeatureRequests: summaries.flatMap(s => s.featureRequests || []),
      allKeywords: summaries.flatMap(s => s.keywords || []),
    };

    return NextResponse.json({
      success: true,
      aggregatedInsights,
      summaryCount: summaries.length,
    });
  } catch (error) {
    console.error('Error aggregating summary insights:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
