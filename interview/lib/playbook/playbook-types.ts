/**
 * ACE (Agentic Context Engineering) Playbook Types
 * Based on the paper: https://arxiv.org/pdf/2510.04618
 */

export type PlaybookSection = 
  | 'strategies_and_hard_rules'
  | 'effective_followup_patterns'
  | 'common_participant_responses'
  | 'red_flags_to_watch_for'
  | 'clarification_techniques'
  | 'topic_transition_strategies'
  | 'emotion_handling_guidelines'
  | 'contradiction_resolution'
  | 'guardrail_handling'
  | 'general_guidelines';

export type PlaybookBullet = {
  bulletId: string; // e.g., "ctx-00263"
  content: string;
  helpful?: number; // 0-1 score
  harmful?: number; // 0-1 score
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type PlaybookSectionData = {
  sectionName: PlaybookSection;
  bullets: PlaybookBullet[];
};

export type Playbook = {
  playbookId: string;
  researchGoalId?: string;
  version: number;
  sections: PlaybookSectionData[];
  metadata: {
    totalStrategies: number;
    totalBullets: number;
    lastUpdatedBy: 'generator' | 'reflection' | 'curator' | 'manual';
    createdAt: string;
    updatedAt: string;
  };
};

export type PlaybookOperation = {
  type: 'ADD';
  section: PlaybookSection;
  content: string;
  reasoning?: string;
};

export type PlaybookUpdateRequest = {
  operations: PlaybookOperation[];
  reasoning: string;
};

