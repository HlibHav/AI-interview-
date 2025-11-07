type PGJType = 'pains' | 'gains' | 'jobs';

const DEFAULT_MAX_ITEMS = 5;

const CLASSIFIERS: Record<PGJType, string[]> = {
  pains: ['pain', 'frustrat', 'challenge', 'probl', 'fear', 'concern', 'block', 'risk', 'anx'],
  gains: ['benefit', 'opportun', 'positive', 'improv', 'goal', 'value', 'advantage', 'success'],
  jobs: ['need to', 'have to', 'trying to', 'task', 'responsible', 'ensure', 'so that', 'aim', 'objective']
};

const LABELS: Record<PGJType, string> = {
  pains: 'pain',
  gains: 'gain',
  jobs: 'job'
};

function normalizeText(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    try {
      return Object.values(value)
        .map((val) => normalizeText(val))
        .filter(Boolean)
        .join(' ');
    } catch {
      return '';
    }
  }
  return '';
}

function classifySentence(sentence: string, type: PGJType): boolean {
  const lower = sentence.toLowerCase();
  return CLASSIFIERS[type].some((token) => lower.includes(token));
}

function fallbackLabel(sentence: string, type: PGJType) {
  return `${LABELS[type]}: ${sentence.replace(/\s+/g, ' ').trim()}`;
}

export function derivePainGainJobsFromSummary(summary: any) {
  const candidateSentences = [
    ...(summary?.insights ?? []),
    summary?.summary ?? ''
  ]
    .map((text: any) => normalizeText(text))
    .flatMap((text: string) => text.split(/[.!?]\s+/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  const result: Record<PGJType, string[]> = {
    pains: [],
    gains: [],
    jobs: []
  };

  (['pains', 'gains', 'jobs'] as PGJType[]).forEach((type) => {
    if (Array.isArray(summary?.[type]) && summary[type].length > 0) {
      result[type] = summary[type].map((item: any) => normalizeText(item)).filter(Boolean);
      return;
    }

    const hits = candidateSentences.filter((sentence) => classifySentence(sentence, type));
    if (hits.length > 0) {
      result[type] = hits.slice(0, DEFAULT_MAX_ITEMS);
    } else {
      result[type] = candidateSentences.slice(0, DEFAULT_MAX_ITEMS).map((sentence) => fallbackLabel(sentence, type));
    }
  });

  return result;
}

