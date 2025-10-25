import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '10');

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
            PsychometricProfile(
              where: { path: ["sessionId"], operator: Equal, valueText: "${sessionId}" }
              limit: ${limit}
            ) {
              profileId
              sessionId
              openness
              conscientiousness
              extraversion
              agreeableness
              neuroticism
              enneagramType
              reasoning
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
      profiles: result.data?.Get?.PsychometricProfile || [],
    });
  } catch (error) {
    console.error('Error fetching psychometric profiles:', error);
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
    
    const profileData = await request.json();
    
    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Generate a UUID for the profile if not provided
    const profileId = profileData.profileId || crypto.randomUUID();

    const objectData = {
      class: 'PsychometricProfile',
      properties: {
        profileId,
        sessionId: profileData.sessionId || '',
        openness: profileData.openness || 0,
        conscientiousness: profileData.conscientiousness || 0,
        extraversion: profileData.extraversion || 0,
        agreeableness: profileData.agreeableness || 0,
        neuroticism: profileData.neuroticism || 0,
        enneagramType: profileData.enneagramType || 0,
        reasoning: profileData.reasoning || '',
        createdAt: profileData.createdAt || new Date().toISOString(),
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
      throw new Error(`Failed to create psychometric profile: ${error}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      profileId,
      objectId: result.id,
    });
  } catch (error) {
    console.error('Error creating psychometric profile:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
