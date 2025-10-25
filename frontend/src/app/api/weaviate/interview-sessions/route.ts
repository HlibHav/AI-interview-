import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // GraphQL query to fetch user interview sessions
    const query = {
      query: `
        {
          Get {
            InterviewSession(limit: ${limit}) {
              sessionId
              planId
              respondentName
              respondentEmail
              userRole
              company
              productArea
              startTime
              endTime
              status
              beyondPresenceSessionId
              recordingUrl
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
      sessions: result.data?.Get?.UserInterviewSession || [],
    });
  } catch (error) {
    console.error('Error fetching interview sessions:', error);
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
    
    const sessionData = await request.json();

    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Generate a UUID for the session if not provided
    const sessionId = sessionData.sessionId || crypto.randomUUID();

    const objectData = {
      class: 'InterviewSession',
      properties: {
        sessionId,
        planId: sessionData.planId || '',
        respondentName: sessionData.respondentName || '',
        respondentEmail: sessionData.respondentEmail || '',
        userRole: sessionData.userRole || '',
        company: sessionData.company || '',
        productArea: sessionData.productArea || '',
        startTime: sessionData.startTime || new Date().toISOString(),
        endTime: sessionData.endTime || '',
        status: sessionData.status || 'scheduled',
        beyondPresenceSessionId: sessionData.beyondPresenceSessionId || '',
        recordingUrl: sessionData.recordingUrl || '',
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
      throw new Error(`Failed to create session: ${error}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      sessionId,
      objectId: result.id,
    });
  } catch (error) {
    console.error('Error creating interview session:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
