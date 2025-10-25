import { NextRequest, NextResponse } from 'next/server';
import weaviate from 'weaviate-ts-client';

// Initialize Weaviate client
let client;
try {
  client = weaviate.client({
    scheme: 'http',
    host: process.env.WEAVIATE_HOST || 'localhost:8080',
    apiKey: process.env.WEAVIATE_API_KEY,
  });
} catch (error) {
  console.error('Failed to initialize Weaviate client:', error);
}

// Define schema classes
const schemaClasses = [
  {
    class: 'ResearchGoal',
    description: 'Research goals and objectives',
    properties: [
      { name: 'goalText', dataType: ['text'] },
      { name: 'targetAudience', dataType: ['text'] },
      { name: 'duration', dataType: ['int'] },
      { name: 'sensitivity', dataType: ['text'] },
      { name: 'createdAt', dataType: ['date'] }
    ]
  },
  {
    class: 'QuestionPlan',
    description: 'Interview question plans and scripts',
    properties: [
      { name: 'researchGoalId', dataType: ['text'] },
      { name: 'introduction', dataType: ['text'] },
      { name: 'questions', dataType: ['text[]'] },
      { name: 'followUps', dataType: ['text'] },
      { name: 'createdAt', dataType: ['date'] }
    ]
  },
  {
    class: 'InterviewChunk',
    description: 'Individual interview transcript chunks',
    properties: [
      { name: 'sessionId', dataType: ['text'] },
      { name: 'speaker', dataType: ['text'] },
      { name: 'text', dataType: ['text'] },
      { name: 'summary', dataType: ['text'] },
      { name: 'keywords', dataType: ['text[]'] },
      { name: 'sentiment', dataType: ['text'] },
      { name: 'timestamp', dataType: ['date'] }
    ]
  },
  {
    class: 'PsychProfile',
    description: 'Psychological profiles from interviews',
    properties: [
      { name: 'sessionId', dataType: ['text'] },
      { name: 'openness', dataType: ['number'] },
      { name: 'conscientiousness', dataType: ['number'] },
      { name: 'extraversion', dataType: ['number'] },
      { name: 'agreeableness', dataType: ['number'] },
      { name: 'neuroticism', dataType: ['number'] },
      { name: 'enneagramType', dataType: ['int'] },
      { name: 'explanation', dataType: ['text'] },
      { name: 'createdAt', dataType: ['date'] }
    ]
  }
];

export async function POST(request: NextRequest) {
  try {
    const { action, data, className } = await request.json();

    switch (action) {
      case 'create_schema':
        await createSchema();
        return NextResponse.json({ success: true, message: 'Schema created successfully' });

      case 'store':
        const result = await storeData(className, data);
        return NextResponse.json({ success: true, id: result.id });

      case 'search':
        const searchResults = await searchData(className, data);
        return NextResponse.json({ success: true, results: searchResults });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Weaviate operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform Weaviate operation' },
      { status: 500 }
    );
  }
}

async function createSchema() {
  try {
    if (!client) {
      throw new Error('Weaviate client not initialized');
    }
    
    // Check if schema already exists
    const existingSchema = await client.schema.getter().do();
    const existingClasses = existingSchema.classes?.map(c => c.class) || [];

    for (const schemaClass of schemaClasses) {
      if (!existingClasses.includes(schemaClass.class)) {
        await client.schema.classCreator().withClass(schemaClass).do();
      }
    }
  } catch (error) {
    console.error('Schema creation error:', error);
    throw error;
  }
}

async function storeData(className: string, data: any) {
  try {
    if (!client) {
      throw new Error('Weaviate client not initialized');
    }
    
    const result = await client.data
      .creator()
      .withClassName(className)
      .withProperties(data)
      .do();

    return result;
  } catch (error) {
    console.error('Data storage error:', error);
    throw error;
  }
}

async function searchData(className: string, searchParams: any) {
  try {
    if (!client) {
      throw new Error('Weaviate client not initialized');
    }
    
    const { query, limit = 10, nearText } = searchParams;

    let searchBuilder = client.graphql
      .get()
      .withClassName(className)
      .withFields('_additional { id } ... on ' + className + ' { * }')
      .withLimit(limit);

    if (nearText) {
      searchBuilder = searchBuilder.withNearText({
        concepts: [nearText],
        certainty: 0.7
      });
    }

    const result = await searchBuilder.do();
    return result.data.Get[className] || [];
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}
