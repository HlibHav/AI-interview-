import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Build GraphQL query with optional status filter
    let whereClause = '';
    if (status) {
      whereClause = `where: { path: ["status"], operator: Equal, valueText: "${status}" }`;
    }

    const query = {
      query: `
        {
          Get {
            ResearchGoal(limit: ${limit}${whereClause ? `, ${whereClause}` : ''}) {
              goalId
              goalText
              targetAudience
              sensitiveTopics
              duration
              adminEmail
              createdAt
              status
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
      goals: result.data?.Get?.ResearchGoal || [],
    });
  } catch (error) {
    console.error('Error fetching research goals:', error);
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
    
    const goalData = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Generate a UUID for the goal if not provided
    const goalId = goalData.goalId || crypto.randomUUID();

    const objectData = {
      class: 'ResearchGoal',
      properties: {
        goalId,
        goalText: goalData.goalText || '',
        targetAudience: goalData.targetAudience || '',
        sensitiveTopics: goalData.sensitiveTopics || [],
        duration: goalData.duration || 15,
        adminEmail: goalData.adminEmail || '',
        createdAt: goalData.createdAt || new Date().toISOString(),
        status: goalData.status || 'draft',
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
      throw new Error(`Failed to create research goal: ${error}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      goalId,
      objectId: result.id,
    });
  } catch (error) {
    console.error('Error creating research goal:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { goalId, updates } = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // First, find the object by goalId
    const searchQuery = {
      query: `
        {
          Get {
            ResearchGoal(where: { path: ["goalId"], operator: Equal, valueText: "${goalId}" }) {
              _additional { id }
            }
          }
        }
      `
    };

    const searchResponse = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${weaviateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchQuery),
    });

    if (!searchResponse.ok) {
      throw new Error(`Search request failed: ${searchResponse.status}`);
    }

    const searchResult = await searchResponse.json();
    const objects = searchResult.data?.Get?.ResearchGoal || [];

    if (objects.length === 0) {
      throw new Error('Research goal not found');
    }

    const objectId = objects[0]._additional.id;

    // Update the object
    const updateResponse = await fetch(`${baseUrl}/objects/${objectId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${weaviateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: updates,
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update research goal: ${error}`);
    }

    return NextResponse.json({
      success: true,
      goalId,
    });
  } catch (error) {
    console.error('Error updating research goal:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
