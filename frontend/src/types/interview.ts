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
}

export interface InterviewScript {
  type: "interview_script";
  introduction: string;
  questions: InterviewQuestion[];
  closing?: string;
  reminders?: string[];
}
