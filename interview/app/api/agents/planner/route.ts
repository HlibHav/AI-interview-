import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to store data in Weaviate
async function storeInWeaviate(className: string, data: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/weaviate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'store', className, data })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Weaviate storage error for ${className}:`, error);
    throw error;  // Propagate error instead of silently returning null
  }
}

// Helper function to call Weaviate API
async function callWeaviateAPI(action: string, className: string, data: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/weaviate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, className, data })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Weaviate API call error for ${action}:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    const { researchGoal, clarifications, brief, researchGoalUuid, duration } = await request.json();
    
    console.log('🔍 Planner request:', { researchGoal, clarificationsCount: clarifications?.length || 0, hasBrief: !!brief, duration });

    // Calculate number of questions based on duration
    const durationMinutes = duration || 30;
    let questionCount;
    if (durationMinutes <= 5) {
      questionCount = 3;
    } else if (durationMinutes <= 10) {
      questionCount = 4;
    } else if (durationMinutes <= 15) {
      questionCount = 5;
    } else if (durationMinutes <= 20) {
      questionCount = 6;
    } else if (durationMinutes <= 30) {
      questionCount = 7;
    } else {
      questionCount = 8;
    }

    console.log(`🔍 Duration: ${durationMinutes} minutes, Question Count: ${questionCount}`);

    const systemPrompt = `You are an expert qualitative researcher. Based on the research goal and clarifications, draft an interview plan. Write a short introduction describing who you are, why the study is important and how data will be used. Then propose EXACTLY ${questionCount} open‑ended questions covering the main themes. Provide optional follow‑ups for each question. Output a JSON object with \`introduction\`, \`questions\` (array) and \`followUps\` (map). Avoid leading questions and keep the total interview to about ${durationMinutes} minutes.

IMPORTANT: You must generate EXACTLY ${questionCount} questions, no more, no less.

Guidelines:
- Introductions should mention recording, privacy and the respondent's ability to pause at any time.
- Questions should encourage storytelling ("Can you describe…?") rather than yes/no responses.
- For each main question, suggest one or two deeper probes in case the participant mentions something intriguing.
- Generate exactly ${questionCount} questions to fit the ${durationMinutes}-minute timeframe.`;

    const userPrompt = `Research Goal: ${researchGoal}
Clarifications: ${JSON.stringify(clarifications)}
Brief: ${brief}

CRITICAL REQUIREMENT: Generate EXACTLY ${questionCount} questions for a ${durationMinutes}-minute interview.

Return a JSON object with this structure:
{
  "introduction": "string",
  "questions": [
    {
      "id": "string",
      "text": "string",
      "topic": "string"
    }
  ],
  "followUps": {
    "questionId": ["follow-up 1", "follow-up 2"]
  }
}

REMEMBER: The questions array must contain EXACTLY ${questionCount} questions.`;

    console.log('🤖 Making OpenAI API call for interview script generation...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7
    });
    
    console.log('✅ OpenAI API call successful');

    const response = completion.choices[0].message.content;
    
    // Extract JSON from the response (it might be wrapped in markdown or other text)
    let script: any = {};
    try {
      // Try to find JSON in the response
      const jsonMatch = response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        script = JSON.parse(jsonMatch[0]);
      } else {
        script = JSON.parse(response || '{}');
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      throw new Error('Failed to parse interview script from AI response');
    }

    // Validate that we got the correct number of questions
    const actualQuestionCount = script.questions?.length || 0;
    console.log(`🔍 Expected ${questionCount} questions, got ${actualQuestionCount}`);
    
    if (actualQuestionCount !== questionCount) {
      console.warn(`⚠️ AI generated ${actualQuestionCount} questions instead of ${questionCount}. This may be due to AI not following instructions precisely.`);
    }

    // Store question plan in Weaviate with cross-reference to research goal
    let questionPlanUuid = null;
    try {
      const questionPlanData = {
        researchGoalId: researchGoalUuid, // backup text field
        introduction: script.introduction,
        questions: script.questions?.map((q: any) => q.text) || [],
        followUps: JSON.stringify(script.followUps || {}),
        createdAt: new Date().toISOString()
      };
      
      const result = await callWeaviateAPI('store', 'QuestionPlan', questionPlanData);
      
      questionPlanUuid = result.id;
      console.log('✅ Created question plan with cross-reference to research goal');
    } catch (error) {
      console.error('❌ Failed to store question plan:', error);
      // Continue without storing - this is not critical for script generation
    }

    return NextResponse.json({
      success: true,
      script,
      researchGoalUuid,
      questionPlanUuid
    });

  } catch (error) {
    console.error('❌ Planner agent error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate interview script';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'OpenAI API key is invalid or missing. Please check your OPENAI_API_KEY environment variable.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again in a few minutes.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing.';
      } else if (error.message.includes('parse')) {
        errorMessage = 'Failed to parse AI response. The AI may have returned invalid JSON.';
      } else {
        errorMessage = `Planner error: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
