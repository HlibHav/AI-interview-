import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Build where clause
    let whereConditions = [];
    if (goalId) {
      whereConditions.push(`{ path: ["goalId"], operator: Equal, valueText: "${goalId}" }`);
    }
    if (status) {
      whereConditions.push(`{ path: ["status"], operator: Equal, valueText: "${status}" }`);
    }

    const whereClause = whereConditions.length > 0 
      ? `where: { operator: And, operands: [${whereConditions.join(', ')}] }`
      : '';

    const query = {
      query: `
        {
          Get {
            InterviewPlan(limit: ${limit}${whereClause ? `, ${whereClause}` : ''}) {
              planId
              goalId
              introduction
              questions
              followUps
              estimatedDuration
              version
              status
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
      plans: result.data?.Get?.InterviewPlan || [],
    });
  } catch (error) {
    console.error('Error fetching interview plans:', error);
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
    
    const planData = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Generate a UUID for the plan if not provided
    const planId = planData.planId || crypto.randomUUID();

    const objectData = {
      class: 'InterviewPlan',
      properties: {
        planId,
        goalId: planData.goalId || '',
        introduction: planData.introduction || '',
        questions: planData.questions || [],
        followUps: planData.followUps || [],
        estimatedDuration: planData.estimatedDuration || 15,
        version: planData.version || 1,
        status: planData.status || 'draft',
        createdAt: planData.createdAt || new Date().toISOString(),
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
      throw new Error(`Failed to create interview plan: ${error}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      planId,
      objectId: result.id,
    });
  } catch (error) {
    console.error('Error creating interview plan:', error);
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
    
    const { planId, updates } = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // First, find the object by planId
    const searchQuery = {
      query: `
        {
          Get {
            InterviewPlan(where: { path: ["planId"], operator: Equal, valueText: "${planId}" }) {
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
    const objects = searchResult.data?.Get?.InterviewPlan || [];

    if (objects.length === 0) {
      throw new Error('Interview plan not found');
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
      throw new Error(`Failed to update interview plan: ${error}`);
    }

    return NextResponse.json({
      success: true,
      planId,
    });
  } catch (error) {
    console.error('Error updating interview plan:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
