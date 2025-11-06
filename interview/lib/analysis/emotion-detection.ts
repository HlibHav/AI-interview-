import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return openaiClient;
}

export type EmotionAnalysisResult = {
  emotionScore: number; // 0-1, overall emotional valence (positive = higher)
  energyScore: number; // 0-1, engagement/energy level
  participantMood: string; // e.g., "engaged", "hesitant", "enthusiastic", "thoughtful", "frustrated"
  sentiment: 'positive' | 'negative' | 'neutral';
  reasoning?: string;
};

/**
 * Analyze participant's emotional state and energy level from their response.
 * Scores are used to feed "participant mood" into the agent's system prompt,
 * allowing tone shifts to be handled gracefully.
 */
export async function analyzeEmotionAndEnergy(
  text: string,
  context?: {
    previousMood?: string;
    researchGoal?: string;
    turnIndex?: number;
  }
): Promise<EmotionAnalysisResult> {
  const client = getOpenAIClient();
  if (!client) {
    // Return neutral defaults if OpenAI is not available
    return {
      emotionScore: 0.5,
      energyScore: 0.5,
      participantMood: 'neutral',
      sentiment: 'neutral'
    };
  }

  try {
    const systemPrompt = `You are an expert at analyzing emotional tone and engagement in conversation. 
Analyze the participant's response and provide:
1. Emotion score (0-1): Overall emotional valence where 1 = very positive, 0 = very negative
2. Energy score (0-1): Engagement and energy level where 1 = very engaged/energetic, 0 = low energy/disengaged
3. Participant mood: A concise label describing their emotional state (e.g., "engaged", "hesitant", "enthusiastic", "thoughtful", "frustrated", "excited", "cautious", "confident")
4. Sentiment: Overall sentiment classification (positive, negative, or neutral)

Return only valid JSON in this exact format:
{
  "emotionScore": 0.0-1.0,
  "energyScore": 0.0-1.0,
  "participantMood": "string",
  "sentiment": "positive" | "negative" | "neutral",
  "reasoning": "brief explanation"
}`;

    const contextInfo = context?.previousMood
      ? `Previous participant mood: ${context.previousMood}\n`
      : '';
    const researchContext = context?.researchGoal
      ? `Research context: ${context.researchGoal}\n`
      : '';

    const userPrompt = `${contextInfo}${researchContext}Participant response to analyze:
"${text}"

Provide emotional and energy analysis.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as EmotionAnalysisResult;

    // Validate and clamp scores
    parsed.emotionScore = Math.max(0, Math.min(1, parsed.emotionScore ?? 0.5));
    parsed.energyScore = Math.max(0, Math.min(1, parsed.energyScore ?? 0.5));

    // Ensure valid mood string
    if (!parsed.participantMood || typeof parsed.participantMood !== 'string') {
      parsed.participantMood = 'neutral';
    }

    // Ensure valid sentiment
    if (!['positive', 'negative', 'neutral'].includes(parsed.sentiment)) {
      parsed.sentiment = 'neutral';
    }

    return parsed;
  } catch (error) {
    console.error('[EMOTION] Error analyzing emotion and energy:', error);
    // Return neutral defaults on error
    return {
      emotionScore: 0.5,
      energyScore: 0.5,
      participantMood: 'neutral',
      sentiment: 'neutral',
      reasoning: error instanceof Error ? error.message : 'Analysis failed'
    };
  }
}

/**
 * Batch analyze multiple responses for efficiency.
 * Useful when processing multiple transcript entries at once.
 */
export async function batchAnalyzeEmotion(
  texts: string[],
  context?: {
    previousMood?: string;
    researchGoal?: string;
  }
): Promise<EmotionAnalysisResult[]> {
  // Process in parallel with a limit to avoid overwhelming the API
  const BATCH_SIZE = 5;
  const results: EmotionAnalysisResult[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((text) =>
        analyzeEmotionAndEnergy(text, {
          ...context,
          turnIndex: i + batch.indexOf(text)
        })
      )
    );
    results.push(...batchResults);
  }

  return results;
}

