import { NextRequest, NextResponse } from 'next/server';
import {
  SpanKind,
  SpanStatusCode,
  diag,
  trace,
} from '@opentelemetry/api';
import OpenAI from 'openai';

const OPENAI_PLANNER_MODEL =
  process.env.OPENAI_PLANNER_MODEL?.trim() || 'gpt-4o-mini';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tracer = trace.getTracer('api.agents.planner');

const systemPromptCache = new Map<string, string>();
const userScaffoldCache = new Map<string, { header: string; footer: string }>();
const clarificationsCache = new Map<string, string>();

function buildCacheKey(questionCount: number, durationMinutes: number) {
  return `${questionCount}|${durationMinutes}`;
}

function getSystemPrompt(
  questionCount: number,
  durationMinutes: number
): string {
  const cacheKey = buildCacheKey(questionCount, durationMinutes);
  const cached = systemPromptCache.get(cacheKey);
  if (cached) return cached;
  if (systemPromptCache.size > 100) {
    systemPromptCache.clear();
  }
  const prompt = `You are an expert qualitative researcher. Based on the research goal and clarifications, draft an interview plan. Write a short introduction describing who you are, why the study is important and how data will be used. Then propose EXACTLY ${questionCount} open-ended questions covering the main themes. Provide optional follow-ups for each question. Output a JSON object with \`introduction\`, \`questions\` (array) and \`followUps\` (map). Avoid leading questions and keep the total interview to about ${durationMinutes} minutes.

IMPORTANT: You must generate EXACTLY ${questionCount} questions, no more, no less.

Guidelines:
- Introductions should mention recording, privacy and the respondent's ability to pause at any time.
- Questions should encourage storytelling ("Can you describe…?") rather than yes/no responses.
- For each main question, suggest one or two deeper probes in case the participant mentions something intriguing.
- Generate exactly ${questionCount} questions to fit the ${durationMinutes}-minute timeframe.`;
  systemPromptCache.set(cacheKey, prompt);
  return prompt;
}

function getUserPromptScaffold(
  questionCount: number,
  durationMinutes: number
) {
  const cacheKey = buildCacheKey(questionCount, durationMinutes);
  const cached = userScaffoldCache.get(cacheKey);
  if (cached) return cached;
  if (userScaffoldCache.size > 100) {
    userScaffoldCache.clear();
  }

  const header = 'Research Goal:';
  const footer = `

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

  const scaffold = { header, footer };
  userScaffoldCache.set(cacheKey, scaffold);
  return scaffold;
}

function serializeClarifications(clarifications: unknown): string {
  const key = JSON.stringify(clarifications ?? []);
  const cached = clarificationsCache.get(key);
  if (cached) return cached;
  if (clarificationsCache.size > 1000) {
    clarificationsCache.clear();
  }
  clarificationsCache.set(key, key);
  return key;
}

function getModelPricing(model: string) {
  switch (model) {
    case 'gpt-4o-mini':
      return { prompt: 0.00015, completion: 0.0006 };
    case 'gpt-4o':
      return { prompt: 0.005, completion: 0.015 };
    case 'gpt-4.1-mini':
      return { prompt: 0.0012, completion: 0.0036 };
    default:
      return { prompt: 0.03, completion: 0.06 };
  }
}

// Helper function to call Weaviate API
async function callWeaviateAPI(action: string, className: string, data: any) {
  return tracer.startActiveSpan(
    'planner.weaviate.request',
    { kind: SpanKind.CLIENT },
    async (span) => {
      span.setAttribute('weaviate.action', action);
      span.setAttribute('weaviate.class_name', className);
      try {
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
          }/api/weaviate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, className, data }),
          }
        );

        span.setAttribute('http.status_code', response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        span.setStatus({ code: SpanStatusCode.OK });
        return json;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message:
            error instanceof Error ? error.message : 'Weaviate API error',
        });
        console.error(`Weaviate API call error for ${action}:`, error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

export async function POST(request: NextRequest) {
  return tracer.startActiveSpan(
    'planner.generate',
    { kind: SpanKind.SERVER },
    async (span) => {
      span.setAttributes({
        'http.route': '/api/agents/planner',
        'planner.component': 'agent',
        'http.method': request.method,
      });
      span.addEvent('planner.request.received');
      try {
        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
          const message = 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.';
          diag.error(message);
          span.setStatus({ code: SpanStatusCode.ERROR, message });
           span.setAttribute('http.status_code', 500);
          return NextResponse.json(
            { error: message },
            { status: 500 }
          );
        }

      const {
        researchGoal,
        clarifications,
        brief,
        researchGoalUuid,
        duration,
      } = await request.json();

      span.setAttributes({
        'planner.request.research_goal_uuid': researchGoalUuid ?? '',
        'planner.request.duration.minutes': duration ?? 30,
        'planner.request.clarifications': JSON.stringify(clarifications ?? []),
        'planner.request.brief_present': Boolean(brief),
      });
      span.setAttributes({
        'planner.research_goal_length': researchGoal?.length ?? 0,
        'planner.clarifications.count': clarifications?.length ?? 0,
        'planner.has_brief': Boolean(brief),
        'planner.duration.minutes': duration ?? 30,
        'planner.research_goal.preview': researchGoal?.slice(0, 120) ?? '',
        'planner.request.research_goal_uuid': researchGoalUuid ?? '',
        'planner.request.clarifications_hash': JSON.stringify(
          clarifications ?? []
        ),
        'openai.model': OPENAI_PLANNER_MODEL,
      });

      console.log('🔍 Planner request:', {
        researchGoal,
        clarificationsCount: clarifications?.length || 0,
        hasBrief: !!brief,
        duration,
      });

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

      span.setAttribute('planner.question_count', questionCount);
      console.log(
        `🔍 Duration: ${durationMinutes} minutes, Question Count: ${questionCount}`
      );

      const systemPrompt = getSystemPrompt(questionCount, durationMinutes);
      const { header, footer } = getUserPromptScaffold(
        questionCount,
        durationMinutes
      );
      const serializedClarifications = serializeClarifications(clarifications);
      const userPrompt = `${header} ${researchGoal}
Clarifications: ${serializedClarifications}
Brief: ${brief ?? ''}${footer}`;

      console.log('🤖 Making OpenAI API call for interview script generation...');
      const completion = await tracer.startActiveSpan(
        'planner.openai.chatCompletion',
        { kind: SpanKind.CLIENT },
        async (openaiSpan) => {
          openaiSpan.setAttributes({
            'openai.model': OPENAI_PLANNER_MODEL,
            'openai.temperature': 0.7,
            'openai.messages.system_length': systemPrompt.length,
            'openai.messages.user_length': userPrompt.length,
          });
          try {
            const result = await openai.chat.completions.create({
              model: OPENAI_PLANNER_MODEL,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.7,
            });
            const usage = result.usage;
            if (usage) {
              openaiSpan.setAttributes({
                'openai.usage.prompt_tokens': usage.prompt_tokens ?? 0,
                'openai.usage.completion_tokens': usage.completion_tokens ?? 0,
                'openai.usage.total_tokens': usage.total_tokens ?? 0,
              });
              const pricing = getModelPricing(OPENAI_PLANNER_MODEL);
              const pricePer1KPrompt = pricing.prompt; // USD per 1K input tokens
              const pricePer1KCompletion = pricing.completion; // USD per 1K output tokens
              const promptCostUsd =
                ((usage.prompt_tokens ?? 0) / 1000) * pricePer1KPrompt;
              const completionCostUsd =
                ((usage.completion_tokens ?? 0) / 1000) * pricePer1KCompletion;
              const totalCostUsd = promptCostUsd + completionCostUsd;
              openaiSpan.setAttributes({
                'openai.cost.prompt_usd': Number(promptCostUsd.toFixed(6)),
                'openai.cost.completion_usd': Number(
                  completionCostUsd.toFixed(6)
                ),
                'openai.cost.total_usd': Number(totalCostUsd.toFixed(6)),
              });
              span.setAttributes({
                'openai.usage.prompt_tokens': usage.prompt_tokens ?? 0,
                'openai.usage.completion_tokens':
                  usage.completion_tokens ?? 0,
                'openai.usage.total_tokens': usage.total_tokens ?? 0,
                'openai.cost.total_usd': Number(totalCostUsd.toFixed(6)),
              });
            }
            openaiSpan.setStatus({ code: SpanStatusCode.OK });
            return result;
          } catch (error) {
            openaiSpan.recordException(error as Error);
            openaiSpan.setStatus({
              code: SpanStatusCode.ERROR,
              message:
                error instanceof Error
                  ? error.message
                  : 'OpenAI chat completion error',
            });
            throw error;
          } finally {
            openaiSpan.end();
          }
        }
      );

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
      span.setAttribute(
        'planner.questions.actual_count',
        actualQuestionCount
      );
      console.log(
        `🔍 Expected ${questionCount} questions, got ${actualQuestionCount}`
      );

      if (actualQuestionCount !== questionCount) {
        console.warn(
          `⚠️ AI generated ${actualQuestionCount} questions instead of ${questionCount}. This may be due to AI not following instructions precisely.`
        );
        span.addEvent('planner.question_mismatch', {
          expected: questionCount,
          actual: actualQuestionCount,
        });
      }

      // Store question plan in Weaviate with cross-reference to research goal (async)
      const questionPlanData = {
        researchGoalId: researchGoalUuid,
        introduction: script.introduction,
        questions: script.questions?.map((q: any) => q.text) || [],
        followUps: JSON.stringify(script.followUps || {}),
        createdAt: new Date().toISOString(),
      };

      void callWeaviateAPI('store', 'QuestionPlan', questionPlanData)
        .then((result) => {
          span.addEvent('planner.weaviate.store.completed', {
            questionPlanUuid: result.id ?? '',
          });
        })
        .catch((error) => {
          span.addEvent('planner.weaviate.store.failed', {
            error: error instanceof Error ? error.message : String(error),
          });
          console.error('❌ Failed to store question plan:', error);
        });

      span.addEvent('planner.completed', {
        questionCount: actualQuestionCount,
      });
      span.setAttributes({
        'planner.response.question_plan_uuid': '',
        'planner.response.question_count': actualQuestionCount,
        'planner.response.success': true,
        'planner.response.question_plan_queued': true,
      });
      span.setAttribute('http.status_code', 200);
      span.setStatus({ code: SpanStatusCode.OK });
      return NextResponse.json({
        success: true,
        script,
        researchGoalUuid,
        questionPlanUuid: null,
        questionPlanQueued: true,
      });
    } catch (error) {
      console.error('❌ Planner agent error:', error);
      span.recordException(error as Error);

      // Provide more specific error messages
      let errorMessage = 'Failed to generate interview script';
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage =
            'OpenAI API key is invalid or missing. Please check your OPENAI_API_KEY environment variable.';
        } else if (error.message.includes('rate limit')) {
          errorMessage =
            'OpenAI API rate limit exceeded. Please try again in a few minutes.';
        } else if (error.message.includes('quota')) {
          errorMessage =
            'OpenAI API quota exceeded. Please check your OpenAI account billing.';
        } else if (error.message.includes('parse')) {
          errorMessage = 'Failed to parse AI response. The AI may have returned invalid JSON.';
        } else {
          errorMessage = `Planner error: ${error.message}`;
        }
      }

      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      span.setAttribute('http.status_code', 500);
      return NextResponse.json(
        {
          error: errorMessage,
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    } finally {
      span.addEvent('planner.request.finished');
      span.end();
    }
  });
}
