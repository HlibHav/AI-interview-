import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const metricType = searchParams.get('metricType');
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

    // Build where clause
    let whereConditions = [`{ path: ["sessionId"], operator: Equal, valueText: "${sessionId}" }`];
    if (metricType) {
      whereConditions.push(`{ path: ["metricType"], operator: Equal, valueText: "${metricType}" }`);
    }

    const whereClause = `where: { operator: And, operands: [${whereConditions.join(', ')}] }`;

    const query = {
      query: `
        {
          Get {
            EvaluationMetric(limit: ${limit}, ${whereClause}) {
              metricId
              sessionId
              metricType
              score
              explanation
              phoenixTraceId
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
      metrics: result.data?.Get?.EvaluationMetric || [],
    });
  } catch (error) {
    console.error('Error fetching evaluation metrics:', error);
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
    
    const metricData = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Generate a UUID for the metric if not provided
    const metricId = metricData.metricId || crypto.randomUUID();

    const objectData = {
      class: 'EvaluationMetric',
      properties: {
        metricId,
        sessionId: metricData.sessionId || '',
        metricType: metricData.metricType || 'relevance',
        score: metricData.score || 0,
        explanation: metricData.explanation || '',
        phoenixTraceId: metricData.phoenixTraceId || '',
        createdAt: metricData.createdAt || new Date().toISOString(),
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
      throw new Error(`Failed to create evaluation metric: ${error}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      metricId,
      objectId: result.id,
    });
  } catch (error) {
    console.error('Error creating evaluation metric:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
