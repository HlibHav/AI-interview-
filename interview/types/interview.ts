export type ChatRole = "assistant" | "user" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  script?: InterviewScript;
}

export interface InterviewQuestion {
  question: string;
  intent?: string;
  category?: string;
}

export interface InterviewScript {
  type: "interview_script";
  introduction: string;
  questions: InterviewQuestion[];
  closing?: string;
  reminders?: string[];
}

// LiveKit types
export interface LiveKitTokenRequest {
  roomName: string;
  participantName: string;
  participantMetadata?: string;
}

export interface LiveKitTokenResponse {
  token: string;
  roomName: string;
  participantName: string;
}

// Beyond Presence types
export interface BeyondPresenceAgent {
  id: string;
  name: string;
  avatar_id: string;
  system_prompt: string;
  greeting: string;
  language: string;
  max_session_length_minutes: number;
  capabilities: BeyondPresenceCapability[];
  llm: {
    type: string;
  };
}

export interface BeyondPresenceCapability {
  type: "webcam_vision" | "screen_share" | "file_upload";
}

export interface BeyondPresenceSession {
  sessionId: string;
  agentId: string;
  avatarId: string;
  transportType: string;
  status: "active" | "ended" | "error";
}

export interface BeyondPresenceStreamEvent {
  type: "audio" | "video" | "text" | "error";
  audioUrl?: string;
  videoUrl?: string;
  text?: string;
  timestamp?: string;
  message?: string;
}

// Interview Session types
export interface InterviewSession {
  id: string;
  researchGoal: string;
  script?: InterviewScript;
  participantEmail?: string;
  roomName: string;
  livekitToken?: string;
  beyondPresenceAgentId?: string;
  beyondPresenceSessionId?: string;
  status: "created" | "in_progress" | "completed" | "cancelled";
  startTime?: string;
  endTime?: string;
  transcript?: TranscriptEntry[];
  insights?: SessionInsight[];
  psychometricProfile?: PsychometricProfile;
}

export interface TranscriptEntry {
  speaker: "ai" | "participant";
  content: string;
  timestamp: string;
}

export interface SessionInsight {
  category: string;
  insight: string;
  timestamp: string;
  confidence?: number;
}

// Psychometric types
export interface PsychometricProfile {
  bigFive?: BigFiveProfile;
  enneagram?: EnneagramProfile;
  analysis?: string;
}

export interface BigFiveProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface EnneagramProfile {
  primaryType: number;
  wing?: number;
  description?: string;
}

// Agent response types
export interface InterviewerAgentResponse {
  action: "ask_followup" | "move_to_next" | "clarify" | "end_interview";
  content: string;
  reason: string;
  questionId?: string;
}

export interface ClarificationAgentResponse {
  clarifiedGoal: string;
  targetAudience: string;
  keyTopics: string[];
  avoidTopics: string[];
  suggestedDuration: number;
}

export interface PlannerAgentResponse {
  script: InterviewScript;
  estimatedDuration: number;
  rationale: string;
}

export interface SummarizerAgentResponse {
  summary: string;
  keyFindings: string[];
  themes: string[];
  recommendations: string[];
}

