import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchTranscriptMemory } from '@/lib/weaviate/memory-search';
import {
  fetchLatestPlaybookForResearchGoal,
  fetchPlaybook,
  formatPlaybookForPrompt,
  createEmptyPlaybook
} from '@/lib/playbook/playbook-storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to search Weaviate for similar content
async function searchWeaviate(className: string, query: string, limit: number = 5) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/weaviate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'search', 
        className, 
        data: { query, limit, nearText: query } 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Weaviate search error:', error);
    return { results: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      script, 
      transcript, 
      currentQuestion, 
      participantResponse,
      sessionContext,
      // New context fields from analysis
      participantMood,
      contradictionFlags,
      memoryContext,
      guardrailWarnings,
      // ACE playbook support
      researchGoalId,
      playbookId
    } = await request.json();

    // Load playbook for ACE framework
    let playbook = null;
    let playbookText = '';
    if (playbookId) {
      playbook = await fetchPlaybook(playbookId);
    } else if (researchGoalId) {
      playbook = await fetchLatestPlaybookForResearchGoal(researchGoalId);
    }

    if (playbook) {
      playbookText = formatPlaybookForPrompt(playbook);
    }

    const systemPrompt = `You are a friendly, non‑judgmental interviewer. Introduce yourself, summarise the purpose of the study and ask the first question from the script. After each answer, decide whether to ask a follow‑up or move on. Use active listening cues ("I see", "Can you tell me more about that?"). Respect pauses and only interrupt to clarify. Never share opinions or advice.

Guidelines:
- Maintain a warm and empathetic tone. Do not comment on the content of answers beyond prompting for elaboration.
- If the respondent goes off topic but shares something important, temporarily deviate from the script to explore the insight, then return to the planned questions.
- Use the conversation context to generate appropriate follow-ups.
- Pay attention to the participant's mood and emotional state - adjust your tone accordingly.
- If contradictions are detected, gently clarify rather than confront.
- If guardrails are triggered (off-topic or sensitive content), gracefully redirect the conversation.
- Return structured responses with action type and content.${playbookText ? `

# Interview Playbook (Strategies and Patterns):

${playbookText}

- Reference relevant bullet IDs from the playbook in your reasoning
- Apply strategies from the playbook that are relevant to the current situation
- Avoid patterns marked as "harmful" in the playbook` : ''}`;

    // Search for similar responses in Weaviate for context (optional)
    let similarContext = '';
    try {
      const similarResponses = await searchWeaviate('TranscriptChunk', participantResponse, 3);
      similarContext = similarResponses.results?.map((r: any) => r.text).join('\n') || '';
    } catch (error) {
      console.log('Weaviate search skipped:', error);
      similarContext = '';
    }

    // Hierarchical memory search for long-range recall
    let memoryRecall = '';
    if (sessionContext?.sessionId && participantResponse) {
      try {
        const memoryResults = await searchTranscriptMemory(participantResponse, {
          sessionId: sessionContext.sessionId,
          limit: 3,
          minSimilarity: 0.7,
          speaker: 'participant'
        });
        if (memoryResults.length > 0) {
          memoryRecall = `Earlier relevant statements:\n${memoryResults
            .map((r) => `[Turn ${r.turnIndex}]: ${r.text}`)
            .join('\n')}`;
        }
      } catch (error) {
        console.warn('Memory search skipped:', error);
      }
    }

    // Build context string with new fields
    const contextParts: string[] = [];
    
    if (participantMood) {
      contextParts.push(`Participant Mood: ${participantMood}`);
    }
    
    if (memoryContext) {
      contextParts.push(`Memory Context: ${memoryContext}`);
    } else if (memoryRecall) {
      contextParts.push(memoryRecall);
    }
    
    if (contradictionFlags && Array.isArray(contradictionFlags) && contradictionFlags.length > 0) {
      contextParts.push(`⚠️ Contradictions detected: ${contradictionFlags.length} potential conflicts found. Consider asking clarifying questions.`);
    }
    
    if (guardrailWarnings && guardrailWarnings.length > 0) {
      contextParts.push(`⚠️ Guardrails: ${guardrailWarnings.join(', ')}. Consider redirecting conversation.`);
    }

    const enhancedContext = contextParts.length > 0 ? contextParts.join('\n') + '\n\n' : '';

    const userPrompt = `Interview Script: ${JSON.stringify(script)}
Current Question: ${currentQuestion}
Participant Response: ${participantResponse}
Session Context: ${JSON.stringify(sessionContext)}
Full Transcript: ${transcript}

${enhancedContext}Similar responses from past interviews: ${similarContext}

Based on the participant's response${participantMood ? ` (current mood: ${participantMood})` : ''}, similar past responses, and the context above, decide what to do next. Return a JSON object with:
{
  "action": "ask_followup" | "move_to_next" | "clarify" | "end_interview",
  "content": "string",
  "reason": "string",
  "questionId": "string" (if applicable)
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    
    // Parse the response, handling both JSON and text formats
    let interviewerResponse;
    try {
      // Try to parse as JSON first
      interviewerResponse = JSON.parse(response || '{}');
    } catch (parseError) {
      // If not JSON, create a structured response from text
      interviewerResponse = {
        action: "ask_followup",
        content: response || "I understand. Can you tell me more about that?",
        reason: "Generated from text response",
        questionId: "followup"
      };
    }

    return NextResponse.json({
      success: true,
      response: interviewerResponse
    });

  } catch (error) {
    console.error('Interviewer agent error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: `Failed to process interviewer response: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
