/**
 * Session Manager for Interview Sessions
 * Handles creation, storage, and retrieval of interview sessions in Weaviate
 */

export interface SessionData {
  sessionId: string;
  researchGoal: string;
  targetAudience?: string;
  duration?: number;
  sensitivity?: string;
  participantEmail?: string;
  participantName?: string;
  roomName?: string;
  livekitToken?: string;
  beyondPresenceAgentId?: string;
  beyondPresenceSessionId?: string;
  status?: 'created' | 'in_progress' | 'completed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  script?: any;
  transcript?: any[];
  insights?: any[];
  psychometricProfile?: any;
  keyFindings?: string[];
  summary?: string;
  createdBy?: string;
  tags?: string[];
  isPublic?: boolean;
  accessCode?: string;
}

export class SessionManager {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Create a new interview session
   */
  async createSession(sessionData: Partial<SessionData>): Promise<SessionData> {
    try {
      const response = await fetch('/api/weaviate/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_session',
          data: sessionData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const result = await response.json();
      return result.session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const response = await fetch('/api/weaviate/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_session',
          data: { sessionId },
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get session: ${response.statusText}`);
      }

      const result = await response.json();
      return result.session;
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<SessionData> {
    try {
      const response = await fetch('/api/weaviate/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_session',
          data: { sessionId, updates },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.statusText}`);
      }

      const result = await response.json();
      return result.session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  /**
   * List sessions with optional filters
   */
  async listSessions(filters: {
    status?: string;
    createdBy?: string;
    limit?: number;
  } = {}): Promise<SessionData[]> {
    try {
      const response = await fetch('/api/weaviate/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'list_sessions',
          data: { filters },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to list sessions: ${response.statusText}`);
      }

      const result = await response.json();
      return result.sessions;
    } catch (error) {
      console.error('Error listing sessions:', error);
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/weaviate/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_session',
          data: { sessionId },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Generate session URL for sharing
   */
  generateSessionUrl(sessionId: string): string {
    return `${this.baseUrl}/respondent?session=${sessionId}`;
  }

  /**
   * Start interview session (update status to in_progress)
   */
  async startSession(sessionId: string): Promise<SessionData> {
    return this.updateSession(sessionId, {
      status: 'in_progress',
      startTime: new Date().toISOString(),
    });
  }

  /**
   * Complete interview session
   */
  async completeSession(sessionId: string, summary?: string, keyFindings?: string[]): Promise<SessionData> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const startTime = session.startTime ? new Date(session.startTime) : new Date();
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    return this.updateSession(sessionId, {
      status: 'completed',
      endTime: endTime.toISOString(),
      durationMinutes,
      summary,
      keyFindings,
    });
  }

  /**
   * Add transcript entry to session
   */
  async addTranscriptEntry(sessionId: string, entry: {
    speaker: 'ai' | 'participant';
    text: string;
    timestamp: string;
  }): Promise<SessionData> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const transcript = session.transcript || [];
    transcript.push(entry);

    return this.updateSession(sessionId, { transcript });
  }

  /**
   * Add insight to session
   */
  async addInsight(sessionId: string, insight: {
    category: string;
    insight: string;
    confidence?: number;
    timestamp: string;
  }): Promise<SessionData> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const insights = session.insights || [];
    insights.push(insight);

    return this.updateSession(sessionId, { insights });
  }

  /**
   * Set psychometric profile for session
   */
  async setPsychometricProfile(sessionId: string, profile: any): Promise<SessionData> {
    return this.updateSession(sessionId, { psychometricProfile: profile });
  }

  /**
   * Initialize Weaviate schema
   */
  async initializeSchema(): Promise<boolean> {
    try {
      const response = await fetch('/api/weaviate/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_schema',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize schema: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error initializing schema:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
