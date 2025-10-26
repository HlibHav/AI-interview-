import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to store data in Weaviate
async function storeInWeaviate(className: string, data: any) {
  try {
    const response = await fetch('http://localhost:3000/api/weaviate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'store', className, data })
    });
    return await response.json();
  } catch (error) {
    console.error('Weaviate storage error:', error);
    return null;
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

    const { researchGoal, clarifications, brief } = await request.json();
    
    console.log('🔍 Planner request:', { researchGoal, clarificationsCount: clarifications?.length || 0, hasBrief: !!brief });

    const systemPrompt = `You are an expert qualitative researcher. Based on the research goal and clarifications, draft an interview plan. Write a short introduction describing who you are, why the study is important and how data will be used. Then propose 5–8 open‑ended questions covering the main themes. Provide optional follow‑ups for each question. Output a JSON object with \`introduction\`, \`questions\` (array) and \`followUps\` (map). Avoid leading questions and keep the total interview to about 15 minutes.

Guidelines:
- Introductions should mention recording, privacy and the respondent's ability to pause at any time.
- Questions should encourage storytelling ("Can you describe…?") rather than yes/no responses.
- For each main question, suggest one or two deeper probes in case the participant mentions something intriguing.`;

    const userPrompt = `Research Goal: ${researchGoal}
Clarifications: ${JSON.stringify(clarifications)}
Brief: ${brief}

Generate a comprehensive interview script. Return a JSON object with this structure:
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
}`;

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

    // Store question plan in Weaviate (temporarily disabled due to configuration issues)
    try {
      const questionPlanData = {
        researchGoalId: researchGoal,
        introduction: script.introduction,
        questions: script.questions?.map((q: any) => q.text) || [],
        followUps: JSON.stringify(script.followUps || {}),
        createdAt: new Date().toISOString()
      };
      
      await storeInWeaviate('QuestionPlan', questionPlanData);
    } catch (error) {
      console.log('Weaviate storage skipped due to configuration issues:', error);
      // Continue without storing - this is not critical for script generation
    }

    return NextResponse.json({
      success: true,
      script
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
