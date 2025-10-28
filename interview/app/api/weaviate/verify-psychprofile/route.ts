import { NextRequest, NextResponse } from 'next/server';
import { getWeaviateClient } from '@/lib/weaviate/weaviate-helpers';

interface FormattedPsychProfile {
  psychProfileId?: string;
  sessionId?: string;
  scores: {
    openness?: number | null;
    conscientiousness?: number | null;
    extraversion?: number | null;
    agreeableness?: number | null;
    neuroticism?: number | null;
    enneagramType?: number | string | null;
  };
  explanation: unknown;
  createdAt?: string;
  sessionReference: {
    sessionWeaviateId?: string;
    sessionId?: string;
    researchGoal?: string;
    status?: string;
    sessionCreatedAt?: string;
  } | null;
}

const formatPsychProfile = (profile: any): FormattedPsychProfile => ({
  psychProfileId: profile._additional?.id,
  sessionId: profile.sessionId,
  scores: {
    openness: profile.openness,
    conscientiousness: profile.conscientiousness,
    extraversion: profile.extraversion,
    agreeableness: profile.agreeableness,
    neuroticism: profile.neuroticism,
    enneagramType: profile.enneagramType
  },
  explanation: profile.reasoning ? JSON.parse(profile.reasoning) : null,
  createdAt: profile.createdAt,
  sessionReference: null // No session reference in current schema
});

export async function GET(request: NextRequest) {
  try {
    const weaviateClient = getWeaviateClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    console.log('🔍 [VERIFY PSYCHPROFILE] Checking PsychProfile objects in Weaviate');

    // Query all PsychometricProfile objects
    const result = await weaviateClient.graphql
      .get()
      .withClassName('PsychometricProfile')
      .withFields(`
        _additional { id }
        sessionId
        openness
        conscientiousness
        extraversion
        agreeableness
        neuroticism
        enneagramType
        reasoning
        createdAt
      `)
      .withLimit(50)
      .do();

    const psychProfiles = result.data?.Get?.PsychometricProfile || [];
    
    console.log('📊 [VERIFY PSYCHPROFILE] Found PsychProfile objects:', psychProfiles.length);

    // If sessionId is provided, filter results
    let filteredProfiles = psychProfiles;
    if (sessionId) {
      filteredProfiles = psychProfiles.filter((profile: any) => 
        profile.sessionId === sessionId
      );
      console.log(`🔍 [VERIFY PSYCHPROFILE] Filtered for sessionId ${sessionId}:`, filteredProfiles.length);
    }

    // Format the response
    const formattedProfiles: FormattedPsychProfile[] = filteredProfiles.map(formatPsychProfile);

    return NextResponse.json({
      success: true,
      totalPsychProfiles: psychProfiles.length,
      filteredProfiles: filteredProfiles.length,
      sessionId: sessionId || null,
      profiles: formattedProfiles,
      summary: {
        profilesWithSessionReference: formattedProfiles.filter((p) => p.sessionReference).length,
        profilesWithoutSessionReference: formattedProfiles.filter((p) => !p.sessionReference).length,
        averageScores: formattedProfiles.length > 0 ? {
          openness: formattedProfiles.reduce((sum, p) => sum + (p.scores.openness || 0), 0) / formattedProfiles.length,
          conscientiousness: formattedProfiles.reduce((sum, p) => sum + (p.scores.conscientiousness || 0), 0) / formattedProfiles.length,
          extraversion: formattedProfiles.reduce((sum, p) => sum + (p.scores.extraversion || 0), 0) / formattedProfiles.length,
          agreeableness: formattedProfiles.reduce((sum, p) => sum + (p.scores.agreeableness || 0), 0) / formattedProfiles.length,
          neuroticism: formattedProfiles.reduce((sum, p) => sum + (p.scores.neuroticism || 0), 0) / formattedProfiles.length
        } : null
      }
    });

  } catch (error: any) {
    console.error('❌ [VERIFY PSYCHPROFILE] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify PsychProfile objects',
        details: error?.message || error
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [VERIFY PSYCHPROFILE] Checking specific session:', sessionId);

    const weaviateClient = getWeaviateClient();

    // Query PsychometricProfile for specific session
    const result = await weaviateClient.graphql
      .get()
      .withClassName('PsychometricProfile')
      .withFields(`
        _additional { id }
        sessionId
        openness
        conscientiousness
        extraversion
        agreeableness
        neuroticism
        enneagramType
        reasoning
        createdAt
      `)
      .withWhere({
        path: ['sessionId'],
        operator: 'Equal',
        valueText: sessionId
      })
      .do();

    const profiles = result.data?.Get?.PsychometricProfile || [];
    
    console.log(`📊 [VERIFY PSYCHPROFILE] Found ${profiles.length} PsychProfile(s) for session ${sessionId}`);

    if (profiles.length === 0) {
      return NextResponse.json({
        success: true,
        sessionId,
        found: false,
        message: 'No PsychProfile found for this session',
        profiles: []
      });
    }

    const formattedProfiles: FormattedPsychProfile[] = profiles.map(formatPsychProfile);

    return NextResponse.json({
      success: true,
      sessionId,
      found: true,
      count: profiles.length,
      profiles: formattedProfiles
    });

  } catch (error: any) {
    console.error('❌ [VERIFY PSYCHPROFILE] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify PsychProfile for session',
        details: error?.message || error
      },
      { status: 500 }
    );
  }
}
