import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const weaviateUrl = process.env.WEAVIATE_URL || 'qh9p8wwvscu5gubcno0tzg.c0.europe-west3.gcp.weaviate.cloud';
    const weaviateApiKey = process.env.WEAVIATE_API_KEY || 'a2p0Um1kVEo1M3lNeklEQ19qM3FMY2hZL2RiektkRXFoZ3BxK3Bmb2xMSXMrVVVnaWpiUXFyWHFwVFlNPV92MjAw';

    // Ensure URL has proper protocol
    const fullUrl = weaviateUrl.startsWith('http') ? weaviateUrl : `https://${weaviateUrl}`;
    const baseUrl = `${fullUrl}/v1`;

    // Define collection schemas for multi-agent architecture
    const collections = [
      {
        class: 'ResearchGoal',
        properties: [
          { name: 'goalId', dataType: ['text'] },
          { name: 'goalText', dataType: ['text'] },
          { name: 'targetAudience', dataType: ['text'] },
          { name: 'sensitiveTopics', dataType: ['text[]'] },
          { name: 'duration', dataType: ['number'] },
          { name: 'adminEmail', dataType: ['text'] },
          { name: 'createdAt', dataType: ['date'] },
          { name: 'status', dataType: ['text'] }, // "draft", "clarifying", "approved"
        ],
      },
      {
        class: 'ClarificationLog',
        properties: [
          { name: 'logId', dataType: ['text'] },
          { name: 'goalId', dataType: ['text'] },
          { name: 'question', dataType: ['text'] },
          { name: 'answer', dataType: ['text'] },
          { name: 'timestamp', dataType: ['date'] },
          { name: 'agent', dataType: ['text'] }, // "clarification_agent"
        ],
      },
      {
        class: 'InterviewPlan',
        properties: [
          { name: 'planId', dataType: ['text'] },
          { name: 'goalId', dataType: ['text'] },
          { name: 'introduction', dataType: ['text'] },
          { name: 'questions', dataType: ['text[]'] },
          { name: 'followUps', dataType: ['text[]'] },
          { name: 'estimatedDuration', dataType: ['number'] },
          { name: 'version', dataType: ['number'] },
          { name: 'status', dataType: ['text'] }, // "draft", "approved"
          { name: 'createdAt', dataType: ['date'] },
        ],
      },
      {
        class: 'InterviewSession',
        properties: [
          { name: 'sessionId', dataType: ['text'] },
          { name: 'planId', dataType: ['text'] },
          { name: 'respondentName', dataType: ['text'] },
          { name: 'respondentEmail', dataType: ['text'] },
          { name: 'userRole', dataType: ['text'] },
          { name: 'company', dataType: ['text'] },
          { name: 'productArea', dataType: ['text'] },
          { name: 'startTime', dataType: ['date'] },
          { name: 'endTime', dataType: ['date'] },
          { name: 'status', dataType: ['text'] }, // "scheduled", "active", "paused", "completed"
          { name: 'beyondPresenceSessionId', dataType: ['text'] },
          { name: 'recordingUrl', dataType: ['text'] },
        ],
      },
      {
        class: 'TranscriptChunk',
        properties: [
          { name: 'chunkId', dataType: ['text'] },
          { name: 'sessionId', dataType: ['text'] },
          { name: 'speaker', dataType: ['text'] }, // "interviewer", "respondent"
          { name: 'text', dataType: ['text'] },
          { name: 'timestamp', dataType: ['date'] },
          { name: 'questionId', dataType: ['text'] }, // if it's a question
          { name: 'topic', dataType: ['text'] },
          { name: 'sentiment', dataType: ['text'] },
          { name: 'confidence', dataType: ['number'] },
        ],
      },
      {
        class: 'SummaryChunk',
        properties: [
          { name: 'summaryId', dataType: ['text'] },
          { name: 'sessionId', dataType: ['text'] },
          { name: 'chunkId', dataType: ['text'] },
          { name: 'summary', dataType: ['text'] },
          { name: 'keywords', dataType: ['text[]'] },
          { name: 'keyInsights', dataType: ['text[]'] },
          { name: 'painPoints', dataType: ['text[]'] },
          { name: 'featureRequests', dataType: ['text[]'] },
          { name: 'createdAt', dataType: ['date'] },
        ],
      },
      {
        class: 'PsychometricProfile',
        properties: [
          { name: 'profileId', dataType: ['text'] },
          { name: 'sessionId', dataType: ['text'] },
          { name: 'openness', dataType: ['number'] },
          { name: 'conscientiousness', dataType: ['number'] },
          { name: 'extraversion', dataType: ['number'] },
          { name: 'agreeableness', dataType: ['number'] },
          { name: 'neuroticism', dataType: ['number'] },
          { name: 'enneagramType', dataType: ['number'] },
          { name: 'reasoning', dataType: ['text'] },
          { name: 'createdAt', dataType: ['date'] },
        ],
      },
      {
        class: 'EvaluationMetric',
        properties: [
          { name: 'metricId', dataType: ['text'] },
          { name: 'sessionId', dataType: ['text'] },
          { name: 'metricType', dataType: ['text'] }, // "relevance", "toxicity", "faithfulness"
          { name: 'score', dataType: ['number'] },
          { name: 'explanation', dataType: ['text'] },
          { name: 'phoenixTraceId', dataType: ['text'] },
          { name: 'createdAt', dataType: ['date'] },
        ],
      },
    ];

    const createdCollections = [];

    for (const collection of collections) {
      try {
        // Check if collection already exists
        const checkResponse = await fetch(`${baseUrl}/schema/${collection.class}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${weaviateApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (checkResponse.ok) {
          console.log(`Collection ${collection.class} already exists`);
          createdCollections.push({ name: collection.class, status: 'exists' });
          continue;
        }

        // Create collection
        const createResponse = await fetch(`${baseUrl}/schema`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${weaviateApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(collection),
        });

        if (createResponse.ok) {
          console.log(`Created collection: ${collection.class}`);
          createdCollections.push({ name: collection.class, status: 'created' });
        } else {
          const error = await createResponse.text();
          console.error(`Failed to create collection ${collection.class}:`, error);
          createdCollections.push({ name: collection.class, status: 'error', error });
        }
      } catch (error) {
        console.error(`Error creating collection ${collection.class}:`, error);
        createdCollections.push({ name: collection.class, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      collections: createdCollections,
    });
  } catch (error) {
    console.error('Collections creation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
