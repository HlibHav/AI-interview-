import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Global session storage declaration
declare global {
  var sessionsStore: Map<string, any> | undefined;
}

let sessions: Map<string, any>;

if (typeof global.sessionsStore === 'undefined') {
  global.sessionsStore = new Map<string, any>();
}
sessions = global.sessionsStore;

async function storeInWeaviate(className: string, data: any) {
  try {
    const weaviate = (await import('weaviate-ts-client')).default;
    const weaviateHost = process.env.WEAVIATE_HOST || 'localhost:8081';
    const isCloud = weaviateHost.includes('.weaviate.network') || weaviateHost.includes('.weaviate.cloud');
    
    const client = weaviate.client({
      scheme: isCloud ? 'https' : 'http',
      host: weaviateHost,
      apiKey: process.env.WEAVIATE_API_KEY as any,
    });

    const result = await client.data
      .creator()
      .withClassName(className)
      .withProperties(data)
      .do();

    console.log(`✅ Stored ${className} in Weaviate:`, result.id);
    return result;
  } catch (error) {
    console.error('Weaviate storage error:', error);
    return null;
  }
}

async function updateSessionInWeaviate(sessionId: string, updates: any) {
  try {
    const weaviate = (await import('weaviate-ts-client')).default;
    const weaviateHost = process.env.WEAVIATE_HOST || 'localhost:8081';
    const isCloud = weaviateHost.includes('.weaviate.network') || weaviateHost.includes('.weaviate.cloud');
    
    const client = weaviate.client({
      scheme: isCloud ? 'https' : 'http',
      host: weaviateHost,
      apiKey: process.env.WEAVIATE_API_KEY as any,
    });

    // First get the session to find its Weaviate ID
    const getResult = await client.graphql
      .get()
      .withClassName('InterviewSession')
      .withWhere({
        path: ['sessionId'],
        operator: 'Equal',
        valueText: sessionId
      })
      .withFields('_additional { id }')
      .do();

    if (getResult.data.Get.InterviewSession.length === 0) {
      throw new Error('Session not found in Weaviate');
    }

    const weaviateId = getResult.data.Get.InterviewSession[0]._additional.id;

    // Prepare update data
    const updateData: any = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Convert JSON objects to strings for storage
    if (updateData.transcript && typeof updateData.transcript === 'object') {
      updateData.transcript = JSON.stringify(updateData.transcript);
    }
    if (updateData.insights && typeof updateData.insights === 'object') {
      updateData.insights = JSON.stringify(updateData.insights);
    }
    if (updateData.psychometricProfile && typeof updateData.psychometricProfile === 'object') {
      updateData.psychometricProfile = JSON.stringify(updateData.psychometricProfile);
    }

    // Update the session
    const result = await client.data
      .updater()
      .withClassName('InterviewSession')
      .withId(weaviateId)
      .withProperties(updateData)
      .do();

    console.log(`✅ Updated session ${sessionId} in Weaviate`);
    return result;
  } catch (error) {
    console.error('Error updating session in Weaviate:', error);
    throw error;
  }
}

async function generateSessionSummary(transcript: any[], researchGoal: string) {
  try {
    const systemPrompt = `You are an expert qualitative researcher. Analyze this interview transcript and create a comprehensive summary with key insights.

CRITICAL: The research goal is about "${researchGoal}". 
Your summary MUST be directly relevant to this research goal.
If the transcript discusses unrelated topics, note this discrepancy.

Guidelines:
- Summarize the main themes and patterns that emerged RELATED TO THE RESEARCH GOAL
- Identify key insights and findings THAT ADDRESS THE RESEARCH GOAL
- Note any surprising or unexpected responses
- Highlight actionable recommendations
- Keep the summary concise but comprehensive
- Focus exclusively on insights that address: ${researchGoal}`;

    const transcriptText = transcript
      .filter(entry => entry.speaker === 'participant')
      .map(entry => entry.text)
      .join('\n\n');

    const userPrompt = `Research Goal: ${researchGoal}

Interview Transcript (Participant Responses Only):
${transcriptText}

IMPORTANT: Analyze this transcript ONLY in the context of the research goal: "${researchGoal}"
If the discussion went off-topic, note that in your analysis.

Generate a comprehensive session summary. Return a JSON object with:
{
  "summary": "Comprehensive summary focused on the research goal",
  "keyThemes": ["theme1 related to research goal", "theme2", "theme3"],
  "keyInsights": ["insight1 addressing research goal", "insight2", "insight3"],
  "surprisingFindings": ["finding1", "finding2"],
  "recommendations": ["recommendation1 for addressing research goal", "recommendation2"],
  "researchValue": "Assessment of how well this interview addressed the research goal",
  "topicRelevance": "high|medium|low - how relevant was the discussion to the research goal"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    return JSON.parse(response || '{}');
  } catch (error) {
    console.error('Error generating session summary:', error);
    return {
      summary: "Unable to generate summary due to processing error",
      keyThemes: [],
      keyInsights: [],
      surprisingFindings: [],
      recommendations: [],
      researchValue: "Unable to assess research value"
    };
  }
}

async function generatePsychometricProfile(transcript: any[], summaries: any[], researchGoal: string) {
  try {
    const systemPrompt = `You are a psychologist analyzing a research interview to estimate personality traits.

Research Context: This interview was conducted to study: "${researchGoal}"
Consider how the participant's responses relate to this research topic.

Based on the complete conversation transcript, estimate the participant's Big Five personality traits on a 0-100 scale:
- Openness: Curiosity, creativity, willingness to try new things
- Conscientiousness: Organization, self-discipline, reliability
- Extraversion: Sociability, assertiveness, emotional expressiveness
- Agreeableness: Trust, altruism, kindness, cooperation
- Neuroticism: Anxiety, moodiness, emotional instability

Also estimate Enneagram type (1-9) if possible.

Guidelines:
- Draw from the actual statements made during the interview
- Provide detailed reasoning for each personality trait score
- Consider both explicit statements and implicit behavioral patterns
- If there is insufficient information for a trait, state that the score is uncertain`;

    const transcriptText = transcript
      .map(entry => `${entry.speaker}: ${entry.text}`)
      .join('\n\n');

    const summariesText = summaries
      .map(summary => summary.summary || summary)
      .join('\n');

    const userPrompt = `Complete Interview Transcript:
${transcriptText}

Session Summaries:
${summariesText}

Analyze the participant's personality and provide a comprehensive psychometric profile. Return a JSON object with:
{
  "bigFive": {
    "openness": {
      "score": number,
      "explanation": "string"
    },
    "conscientiousness": {
      "score": number,
      "explanation": "string"
    },
    "extraversion": {
      "score": number,
      "explanation": "string"
    },
    "agreeableness": {
      "score": number,
      "explanation": "string"
    },
    "neuroticism": {
      "score": number,
      "explanation": "string"
    }
  },
  "enneagram": {
    "type": number,
    "confidence": number,
    "description": "brief explanation"
  },
  "overallProfile": "string",
  "keyInsights": ["insight1", "insight2"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    return JSON.parse(response || '{}');
  } catch (error) {
    console.error('Error generating psychometric profile:', error);
    return {
      bigFive: {
        openness: { score: 50, explanation: "Unable to assess due to processing error" },
        conscientiousness: { score: 50, explanation: "Unable to assess due to processing error" },
        extraversion: { score: 50, explanation: "Unable to assess due to processing error" },
        agreeableness: { score: 50, explanation: "Unable to assess due to processing error" },
        neuroticism: { score: 50, explanation: "Unable to assess due to processing error" }
      },
      enneagram: { type: 5, confidence: 0, description: "Unable to assess due to processing error" },
      overallProfile: "Unable to generate profile due to processing error",
      keyInsights: []
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, transcript, researchGoal } = await request.json();

    console.log('🔄 [SESSION COMPLETE] Processing session:', sessionId);

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session from memory store
    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Calculate session duration
    const startTime = session.startTime ? new Date(session.startTime) : new Date();
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    console.log('📊 [SESSION COMPLETE] Generating summary and insights...');

    // Generate session summary using summarizer agent
    const sessionSummary = await generateSessionSummary(transcript || [], researchGoal || session.researchGoal);

    // Generate psychometric profile using psychometric agent
    const psychometricProfile = await generatePsychometricProfile(transcript || [], session.summaries || [], researchGoal || session.researchGoal);

    // Update session with completion data
    const updatedSession = {
      ...session,
      status: 'completed',
      endTime: endTime.toISOString(),
      durationMinutes,
      transcript: transcript || [],
      insights: sessionSummary,
      psychometricProfile,
      summary: sessionSummary.summary,
      keyFindings: sessionSummary.keyInsights || []
    };

    // Update in memory store
    sessions.set(sessionId, updatedSession);

    // Store/update in Weaviate
    try {
      await updateSessionInWeaviate(sessionId, {
        status: 'completed',
        endTime: endTime.toISOString(),
        durationMinutes,
        transcript: transcript || [],
        insights: sessionSummary,
        psychometricProfile,
        summary: sessionSummary.summary,
        keyFindings: sessionSummary.keyInsights || []
      });

      // Store individual interview chunks with cross-references
      if (transcript && transcript.length > 0) {
        for (const entry of transcript) {
          if (entry.speaker === 'participant') {
            const chunkData = {
              sessionId,
              researchGoal: researchGoal || session.researchGoal,  // NEW: Add research goal for filtering
              researchGoalId: session.researchGoalId || researchGoal || session.researchGoal,  // NEW: Tenant ID
              speaker: entry.speaker,
              text: entry.text,
              summary: sessionSummary.summary,
              keywords: sessionSummary.keyThemes || [],
              sentiment: 'neutral', // Could be enhanced with sentiment analysis
              timestamp: entry.timestamp || new Date().toISOString(),
              // NEW: Add cross-reference capability
              relatedToSession: sessionId
            };
            
            await storeInWeaviate('InterviewChunk', chunkData);
          }
        }
      }

      // Store psychometric profile separately
      const psychProfileData = {
        sessionId,
        openness: psychometricProfile.bigFive?.openness?.score || 50,
        conscientiousness: psychometricProfile.bigFive?.conscientiousness?.score || 50,
        extraversion: psychometricProfile.bigFive?.extraversion?.score || 50,
        agreeableness: psychometricProfile.bigFive?.agreeableness?.score || 50,
        neuroticism: psychometricProfile.bigFive?.neuroticism?.score || 50,
        enneagramType: psychometricProfile.enneagram?.type || 5,
        explanation: psychometricProfile.overallProfile || '',
        createdAt: new Date().toISOString()
      };

      await storeInWeaviate('PsychProfile', psychProfileData);

      console.log('✅ [SESSION COMPLETE] Session completed and stored in Weaviate');

    } catch (weaviateError) {
      console.error('⚠️ [SESSION COMPLETE] Weaviate storage failed:', weaviateError);
      // Continue even if Weaviate storage fails
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
      summary: sessionSummary,
      psychometricProfile
    });

  } catch (error) {
    console.error('❌ [SESSION COMPLETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}
