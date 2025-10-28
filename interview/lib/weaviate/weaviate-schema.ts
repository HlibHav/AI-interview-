export type SchemaClassProperty = {
  name: string;
  dataType: string[];
};

export type SchemaClassReference = {
  name: string;
  targetClass: string;
};

export type SchemaClassDefinition = {
  class: string;
  description: string;
  properties: SchemaClassProperty[];
  references?: SchemaClassReference[];
};

/**
 * Central source of truth for all Weaviate schema classes used by the app.
 * Keeping this in a shared module ensures API routes and helpers stay aligned.
 */
export const schemaClasses: SchemaClassDefinition[] = [
  {
    class: 'ResearchGoal',
    description: 'Research goals and objectives',
    properties: [
      { name: 'goalText', dataType: ['text'] },
      { name: 'targetAudience', dataType: ['text'] },
      { name: 'duration', dataType: ['int'] },
      { name: 'sensitivity', dataType: ['text'] },
      { name: 'clarificationComplete', dataType: ['boolean'] },
      { name: 'clarificationRounds', dataType: ['int'] },
      { name: 'clarifications', dataType: ['text[]'] },
      { name: 'brief', dataType: ['text'] },
      { name: 'createdAt', dataType: ['date'] },
      { name: 'updatedAt', dataType: ['date'] }
    ]
  },
  {
    class: 'QuestionPlan',
    description: 'Interview question plans and scripts',
    properties: [
      { name: 'researchGoalId', dataType: ['text'] }, // backup text field
      { name: 'introduction', dataType: ['text'] },
      { name: 'questions', dataType: ['text[]'] },
      { name: 'followUps', dataType: ['text'] },
      { name: 'createdAt', dataType: ['date'] }
    ],
    references: [
      { name: 'researchGoal', targetClass: 'ResearchGoal' }
    ]
  },
  {
    class: 'InterviewSession',
    description: 'Interview session metadata and transcripts',
    properties: [
      { name: 'sessionId', dataType: ['text'] },
      { name: 'sessionUrl', dataType: ['text'] },
      { name: 'researchGoal', dataType: ['text'] },
      { name: 'targetAudience', dataType: ['text'] },
      { name: 'duration', dataType: ['int'] },
      { name: 'sensitivity', dataType: ['text'] },
      { name: 'participantEmail', dataType: ['text'] },
      { name: 'participantName', dataType: ['text'] },
      { name: 'roomName', dataType: ['text'] },
      { name: 'beyondPresenceAgentId', dataType: ['text'] },
      { name: 'beyondPresenceSessionId', dataType: ['text'] },
      { name: 'status', dataType: ['text'] },
      { name: 'startTime', dataType: ['date'] },
      { name: 'endTime', dataType: ['date'] },
      { name: 'durationMinutes', dataType: ['number'] },
      { name: 'script', dataType: ['text'] },
      { name: 'transcript', dataType: ['text'] },
      { name: 'insights', dataType: ['text'] },
      { name: 'psychometricProfile', dataType: ['text'] },
      { name: 'keyFindings', dataType: ['text[]'] },
      { name: 'summary', dataType: ['text'] },
      { name: 'createdAt', dataType: ['date'] },
      { name: 'updatedAt', dataType: ['date'] },
      { name: 'createdBy', dataType: ['text'] },
      { name: 'tags', dataType: ['text[]'] },
      { name: 'isPublic', dataType: ['boolean'] },
      { name: 'accessCode', dataType: ['text'] }
    ]
  },
  {
    class: 'TranscriptChunk',
    description: 'Individual interview transcript chunks',
    properties: [
      { name: 'sessionId', dataType: ['text'] }, // backup text field
      { name: 'turnIndex', dataType: ['int'] },
      { name: 'speaker', dataType: ['text'] },
      { name: 'text', dataType: ['text'] },
      { name: 'summary', dataType: ['text'] },
      { name: 'keywords', dataType: ['text[]'] },
      { name: 'sentiment', dataType: ['text'] },
      { name: 'timestamp', dataType: ['date'] }
    ],
    references: [
      { name: 'session', targetClass: 'InterviewSession' }
    ]
  },
  {
    class: 'TranscriptDocument',
    description: 'Full transcript document for an interview session',
    properties: [
      { name: 'sessionId', dataType: ['text'] },
      { name: 'text', dataType: ['text'] },
      { name: 'json', dataType: ['text'] },
      { name: 'messageCount', dataType: ['int'] },
      { name: 'wordCount', dataType: ['int'] },
      { name: 'createdAt', dataType: ['date'] },
      { name: 'updatedAt', dataType: ['date'] }
    ],
    references: [
      { name: 'session', targetClass: 'InterviewSession' }
    ]
  },
  {
    class: 'Annotation',
    description: 'Human or AI labels applied to transcript content',
    properties: [
      { name: 'annotationId', dataType: ['text'] },
      { name: 'type', dataType: ['text'] },
      { name: 'label', dataType: ['text'] },
      { name: 'notes', dataType: ['text'] },
      { name: 'confidence', dataType: ['number'] },
      { name: 'tags', dataType: ['text[]'] },
      { name: 'createdAt', dataType: ['date'] },
      { name: 'updatedAt', dataType: ['date'] },
      { name: 'createdBy', dataType: ['text'] }
    ],
    references: [
      { name: 'session', targetClass: 'InterviewSession' },
      { name: 'chunk', targetClass: 'TranscriptChunk' }
    ]
  },
  {
    class: 'PsychometricProfile',
    description: 'Psychological profiles from interviews',
    properties: [
      { name: 'sessionId', dataType: ['text'] }, // backup text field
      { name: 'openness', dataType: ['number'] },
      { name: 'conscientiousness', dataType: ['number'] },
      { name: 'extraversion', dataType: ['number'] },
      { name: 'agreeableness', dataType: ['number'] },
      { name: 'neuroticism', dataType: ['number'] },
      { name: 'enneagramType', dataType: ['int'] },
      { name: 'explanation', dataType: ['text'] },
      { name: 'createdAt', dataType: ['date'] }
    ],
    references: [
      { name: 'session', targetClass: 'InterviewSession' }
    ]
  },
  {
    class: 'BatchSummary',
    description: 'Aggregated summaries for multiple interviews of the same research goal',
    properties: [
      { name: 'batchId', dataType: ['text'] },
      { name: 'overallSummary', dataType: ['text'] },
      { name: 'commonThemes', dataType: ['text[]'] },
      { name: 'aggregatedInsights', dataType: ['text'] },
      { name: 'participantCount', dataType: ['int'] },
      { name: 'createdAt', dataType: ['date'] },
      { name: 'updatedAt', dataType: ['date'] }
    ],
    references: [
      { name: 'researchGoal', targetClass: 'ResearchGoal' },
      { name: 'sessions', targetClass: 'InterviewSession' }
    ]
  }
];

/**
 * Lookup map: class name -> reference property -> target class.
 * This prevents us from hard-coding beacon paths in multiple places.
 */
export const referenceTargets: Record<string, Record<string, string>> = schemaClasses.reduce(
  (acc, schemaClass) => {
    if (schemaClass.references) {
      acc[schemaClass.class] = schemaClass.references.reduce((refAcc, ref) => {
        refAcc[ref.name] = ref.targetClass;
        return refAcc;
      }, {} as Record<string, string>);
    }
    return acc;
  },
  {} as Record<string, Record<string, string>>
);
