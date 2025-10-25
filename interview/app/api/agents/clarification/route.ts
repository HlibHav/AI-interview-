import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to store data in Weaviate (simplified to avoid circular dependencies)
async function storeInWeaviate(className: string, data: any) {
  try {
    // For now, just log the data instead of making HTTP requests
    console.log(`Would store in Weaviate ${className}:`, data);
    return { success: true };
  } catch (error) {
    console.error('Weaviate storage error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { researchGoal, clarifications } = await request.json();
    
    // If we already have 1 clarification, automatically complete
    if (clarifications && clarifications.length >= 1) {
      const brief = `Research goal clarified through 1 round of questions. Ready to proceed with interview script generation based on: ${researchGoal} and the provided clarifications.`;
      
      // Store research goal in Weaviate (temporarily disabled due to configuration issues)
      try {
        const researchGoalData = {
          goalText: researchGoal,
          clarifications: JSON.stringify(clarifications),
          brief: brief,
          createdAt: new Date().toISOString()
        };
        
        await storeInWeaviate('ResearchGoal', researchGoalData);
      } catch (error) {
        console.log('Weaviate storage skipped due to configuration issues:', error);
        // Continue without storing - this is not critical for clarification
      }
      
      return NextResponse.json({
        status: "complete",
        brief: brief,
        questions: []
      });
    }

    const systemPrompt = `You are a senior user-research strategist working for a product team conducting market and user research for possible product ideas such as new features on apps, software product market fit, user needs and pains for the new app. A researcher has provided a high-level goal (e.g., "discover flirting habits of users", "discover how users approach finance", "what type of user habits they have for a running app"). Your job is to ask exactly one clarification question to ensure you understand the most critical aspect of the research goal. Do not generate an interview plan yet. Frame your question neutrally and avoid assuming what the researcher wants.

Guidelines:
- Ask exactly one question, no more, no less.
- Use open, non-leading wording ("How would you define…?" instead of "Is…?").
- If the admin indicates the topic is sensitive (e.g., sexual behaviour or finances), ask about comfort levels and consent processes.
- Focus on the most important aspect: target audience, scope/context, or any sensitive considerations.
- After receiving the answer to the question, respond with "CLARIFICATION_COMPLETE".`;

    const userPrompt = `Research Goal: ${researchGoal}

Previous clarifications: ${JSON.stringify(clarifications)}
Number of clarifications received: ${clarifications.length}

Based on this information:
- If this is the initial request (no previous clarifications), ask exactly 3 clarification questions.
- If you have received answers to all 3 questions (3 clarifications), respond with "CLARIFICATION_COMPLETE" and provide a structured brief.
- If you have received some but not all answers, ask the remaining questions to reach exactly 3 total questions.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    if (response?.includes("CLARIFICATION_COMPLETE")) {
      const brief = response.replace("CLARIFICATION_COMPLETE", "").trim();
      
      // Store research goal in Weaviate (temporarily disabled due to configuration issues)
      try {
        const researchGoalData = {
          goalText: researchGoal,
          clarifications: JSON.stringify(clarifications),
          brief: brief,
          createdAt: new Date().toISOString()
        };
        
        await storeInWeaviate('ResearchGoal', researchGoalData);
      } catch (error) {
        console.log('Weaviate storage skipped due to configuration issues:', error);
        // Continue without storing - this is not critical for clarification
      }
      
      return NextResponse.json({
        status: "complete",
        brief: brief,
        questions: []
      });
    }

    // Extract questions from response
    const questions = response?.split('\n').filter(line => 
      line.trim().length > 0 && 
      (line.includes('?') || line.match(/^\d+\./))
    ).map(q => q.replace(/^\d+\.\s*/, '').trim()) || [];
    
    // Ensure we have exactly 1 question for initial request, or remaining questions for follow-ups
    const expectedQuestions = clarifications.length === 0 ? 1 : Math.max(0, 1 - clarifications.length);
    const limitedQuestions = questions.slice(0, expectedQuestions);

    return NextResponse.json({
      status: "questions",
      questions: limitedQuestions,
      response
    });

  } catch (error) {
    console.error('Clarification agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process clarification request' },
      { status: 500 }
    );
  }
}
