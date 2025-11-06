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

export type NoteCategory = 'goal' | 'friction' | 'workaround' | 'neutral';

export type NoteCategorizationResult = {
  category: NoteCategory;
  confidence: number; // 0-1
  reasoning?: string;
  extractedGoal?: string;
  extractedFriction?: string;
  extractedWorkaround?: string;
};

/**
 * Categorize participant answers into Goals / Frictions / Workarounds in real time.
 * This provides richer structure for the summarizer to leverage during session completion.
 */
export async function categorizeNote(
  text: string,
  context?: {
    researchGoal?: string;
    previousCategories?: NoteCategory[];
  }
): Promise<NoteCategorizationResult> {
  const client = getOpenAIClient();
  if (!client) {
    // Return neutral default if OpenAI is not available
    return {
      category: 'neutral',
      confidence: 0.5
    };
  }

  try {
    const systemPrompt = `You are an expert at categorizing interview responses into research insights.
Categorize the participant's response into one of these categories:

1. **goal**: Describes what the participant wants to achieve, their objectives, aspirations, or desired outcomes
   Examples: "I want to launch a product", "My goal is to increase revenue", "I'm trying to improve user experience"

2. **friction**: Describes problems, pain points, obstacles, challenges, or frustrations
   Examples: "It's really hard to find qualified candidates", "The current process is too slow", "I'm frustrated with the lack of support"

3. **workaround**: Describes solutions, hacks, temporary fixes, or ways the participant has adapted to problems
   Examples: "I built a custom tool to work around this", "I use a spreadsheet instead of the official system", "I've found a way to bypass this issue"

4. **neutral**: General conversation, questions, or responses that don't fit into the above categories
   Examples: "I'm not sure", "That's interesting", general context or background information

The response may contain multiple types of information. Choose the PRIMARY category that best represents the main point.

Return only valid JSON in this exact format:
{
  "category": "goal" | "friction" | "workaround" | "neutral",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "extractedGoal": "extracted goal text if category is goal, else empty string",
  "extractedFriction": "extracted friction text if category is friction, else empty string",
  "extractedWorkaround": "extracted workaround text if category is workaround, else empty string"
}`;

    const researchContext = context?.researchGoal
      ? `Research Goal: ${context.researchGoal}\n\n`
      : '';

    const userPrompt = `${researchContext}Participant response to categorize:
"${text}"

Categorize this response and extract the relevant information.`;

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

    const parsed = JSON.parse(content) as NoteCategorizationResult;

    // Validate category
    const validCategories: NoteCategory[] = ['goal', 'friction', 'workaround', 'neutral'];
    if (!validCategories.includes(parsed.category)) {
      parsed.category = 'neutral';
    }

    // Clamp confidence
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));

    return parsed;
  } catch (error) {
    console.error('[NOTE-CATEGORIZER] Error categorizing note:', error);
    // Return neutral default on error
    return {
      category: 'neutral',
      confidence: 0.5,
      reasoning: error instanceof Error ? error.message : 'Categorization failed'
    };
  }
}

/**
 * Batch categorize multiple responses for efficiency.
 */
export async function batchCategorizeNotes(
  texts: string[],
  context?: {
    researchGoal?: string;
  }
): Promise<NoteCategorizationResult[]> {
  // Process in parallel with a limit
  const BATCH_SIZE = 5;
  const results: NoteCategorizationResult[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((text) => categorizeNote(text, context))
    );
    results.push(...batchResults);
  }

  return results;
}

