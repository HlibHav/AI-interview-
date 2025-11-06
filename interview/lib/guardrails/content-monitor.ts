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

export type GuardrailTriggerType =
  | 'off_topic'
  | 'sensitive_content'
  | 'inappropriate_language'
  | 'personally_identifiable_information'
  | 'none';

export type GuardrailResult = {
  triggered: boolean;
  triggerTypes: GuardrailTriggerType[];
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  suggestedPrompt?: string; // e.g., "Want to stay on launching experiences, right?"
  confidence: number; // 0-1
};

export type GuardrailOptions = {
  researchGoal?: string;
  sensitivity?: 'low' | 'medium' | 'high';
  currentTopic?: string;
};

/**
 * Monitor content for off-topic or sensitive material.
 * Triggers confirmation prompts when guardrails are activated.
 * Respects session sensitivity level for threshold configuration.
 */
export async function checkGuardrails(
  text: string,
  options: GuardrailOptions = {}
): Promise<GuardrailResult> {
  const { researchGoal, sensitivity = 'medium', currentTopic } = options;

  const client = getOpenAIClient();
  if (!client) {
    // Return no trigger if OpenAI is not available
    return {
      triggered: false,
      triggerTypes: ['none'],
      severity: 'low',
      explanation: 'Guardrail check unavailable',
      confidence: 0
    };
  }

  try {
    // Adjust thresholds based on sensitivity
    const sensitivityThresholds = {
      low: 0.9, // Very permissive
      medium: 0.7, // Balanced
      high: 0.5 // Strict
    };

    const threshold = sensitivityThresholds[sensitivity] ?? 0.7;

    const systemPrompt = `You are a content monitor for research interviews. 
Detect when the conversation goes off-topic or contains sensitive content.

Trigger types:
1. **off_topic**: The response is significantly off-topic from the research goal or current discussion
2. **sensitive_content**: Contains sensitive topics (e.g., personal trauma, legal issues, health concerns) that should be handled carefully
3. **inappropriate_language**: Contains inappropriate, offensive, or unprofessional language
4. **personally_identifiable_information**: Contains PII that should be protected (e.g., SSN, credit card numbers, specific addresses)
5. **none**: No issues detected

Severity levels:
- **low**: Minor issue, can be gently redirected
- **medium**: Moderate issue, should be addressed
- **high**: Serious issue, requires immediate attention

Return only valid JSON in this exact format:
{
  "triggered": boolean,
  "triggerTypes": ["off_topic" | "sensitive_content" | "inappropriate_language" | "personally_identifiable_information" | "none"],
  "severity": "low" | "medium" | "high",
  "explanation": "brief explanation",
  "suggestedPrompt": "optional confirmation prompt to redirect (e.g., 'Want to stay on launching experiences, right?')",
  "confidence": 0.0-1.0
}`;

    const researchContext = researchGoal
      ? `Research Goal: ${researchGoal}\n`
      : '';
    const topicContext = currentTopic
      ? `Current Discussion Topic: ${currentTopic}\n`
      : '';
    const sensitivityContext = `Sensitivity Level: ${sensitivity}\n`;

    const userPrompt = `${researchContext}${topicContext}${sensitivityContext}
Participant response to check:
"${text}"

Check for guardrail violations. Threshold: ${threshold}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as GuardrailResult;

    // Validate and normalize
    if (!Array.isArray(parsed.triggerTypes) || parsed.triggerTypes.length === 0) {
      parsed.triggerTypes = ['none'];
    }

    // Filter out 'none' if other triggers are present
    if (parsed.triggerTypes.length > 1 && parsed.triggerTypes.includes('none')) {
      parsed.triggerTypes = parsed.triggerTypes.filter((t) => t !== 'none');
    }

    // Ensure 'none' if not triggered
    if (!parsed.triggered && !parsed.triggerTypes.includes('none')) {
      parsed.triggerTypes.push('none');
    }

    // Validate severity
    if (!['low', 'medium', 'high'].includes(parsed.severity)) {
      parsed.severity = 'medium';
    }

    // Clamp confidence
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));

    // Only consider triggered if confidence meets threshold
    if (parsed.triggered && parsed.confidence < threshold) {
      parsed.triggered = false;
      parsed.triggerTypes = ['none'];
      parsed.severity = 'low';
    }

    return parsed;
  } catch (error) {
    console.error('[GUARDRAILS] Error checking guardrails:', error);
    // Return no trigger on error to avoid blocking conversation
    return {
      triggered: false,
      triggerTypes: ['none'],
      severity: 'low',
      explanation: error instanceof Error ? error.message : 'Guardrail check failed',
      confidence: 0
    };
  }
}

/**
 * Get guardrail trigger flags as an array for storage in transcript chunk.
 */
export function extractGuardrailFlags(result: GuardrailResult): string[] {
  if (!result.triggered || result.triggerTypes.includes('none')) {
    return [];
  }
  return result.triggerTypes;
}

