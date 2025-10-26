// app/lib/livekit-bp-agent-service.ts
// Server-side LiveKit BP Agent Service (bypassing problematic SDK)

// Remove Beyond Presence SDK import to avoid LiveKit client issues
// import BeyondPresence from '@bey-dev/sdk';

export interface LiveKitBPAgentConfig {
  // Beyond Presence configuration
  beyApiKey: string;
  beyAvatarId: string;
  
  // LiveKit configuration
  livekitUrl: string;
  livekitApiKey: string;
  livekitApiSecret: string;
  
  // Agent configuration
  agentIdentity: string;
  roomName: string;
  
  // Interview configuration
  systemPrompt?: string;
  interviewScript?: any;
  researchGoal?: string;
}

export interface AgentStatus {
  isInitialized: boolean;
  sessionId?: string;
  roomName: string;
  agentIdentity: string;
  status: 'idle' | 'initializing' | 'ready' | 'active' | 'error';
  lastActivity?: Date;
  error?: string;
}

export class LiveKitBPAgentService {
  private config: LiveKitBPAgentConfig;
  private status: AgentStatus;
  private eventHandlers: Map<string, Function[]> = new Map();
  private isShuttingDown = false;

  constructor(config: LiveKitBPAgentConfig) {
    this.config = config;
    
    this.status = {
      isInitialized: false,
      roomName: config.roomName,
      agentIdentity: config.agentIdentity,
      status: 'idle'
    };
  }

  /**
   * Initialize the agent following official BP plugin patterns
   * This creates the BP session but doesn't connect to LiveKit directly
   */
  async initialize(): Promise<void> {
    if (this.status.isInitialized) {
      throw new Error('Agent already initialized');
    }

    try {
      // Validate configuration
      if (!this.config.beyApiKey) {
        throw new Error('BEY_API_KEY is not configured');
      }
      if (!this.config.beyAvatarId) {
        throw new Error('BEY_AVATAR_ID is not configured');
      }
      if (!this.config.livekitUrl) {
        throw new Error('LIVEKIT_URL is not configured');
      }
      if (!this.config.livekitApiKey || !this.config.livekitApiSecret) {
        throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured');
      }

      this.status.status = 'initializing';
      this.emit('statusChanged', this.status);

      console.log('🤖 Initializing LiveKit BP Agent Service:', {
        agentIdentity: this.config.agentIdentity,
        roomName: this.config.roomName,
        avatarId: this.config.beyAvatarId,
        livekitUrl: this.config.livekitUrl,
        apiKeyPresent: !!this.config.beyApiKey
      });

      // Step 1: Create Beyond Presence session using direct API call (bypassing SDK)
      const bpSession = await this.createBPSessionDirect();

      console.log('✅ BP Session created:', {
        sessionId: bpSession.id,
        avatarId: bpSession.avatar_id,
        livekitUrl: bpSession.livekit_url
      });

      // Update status - agent is ready for client connections
      this.status.isInitialized = true;
      this.status.sessionId = bpSession.id;
      this.status.status = 'ready';
      this.status.lastActivity = new Date();

      console.log('✅ LiveKit BP Agent Service initialized successfully');
      this.emit('initialized', this.status);

    } catch (error) {
      console.error('❌ Failed to initialize LiveKit BP Agent Service:', error);
      this.status.status = 'error';
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { type: 'initialization', error: this.status.error });
      throw error;
    }
  }

  /**
   * Start the agent (make it active and ready for interactions)
   */
  async start(): Promise<void> {
    if (!this.status.isInitialized) {
      throw new Error('Agent not initialized');
    }

    try {
      this.status.status = 'active';
      this.status.lastActivity = new Date();
      
      console.log('🚀 Starting LiveKit BP Agent Service');
      
      // BP agents don't need REST API calls - they automatically join LiveKit when session is created
      console.log('✅ BP Agent is active and should join LiveKit room automatically');
      
      this.emit('started', this.status);
      console.log('✅ LiveKit BP Agent Service started');

    } catch (error) {
      console.error('❌ Failed to start agent:', error);
      this.status.status = 'error';
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { type: 'start', error: this.status.error });
      throw error;
    }
  }

  /**
   * Process incoming speech/text and generate avatar response
   * NOTE: This method is deprecated - BP avatars respond to LiveKit audio directly
   * No REST API calls needed after session creation
   */
  async processInput(input: string, type: 'speech' | 'text' = 'text'): Promise<void> {
    console.warn('⚠️ processInput() is deprecated - BP avatars respond to LiveKit audio directly');
    console.log(`🎤 Input received (not processed via REST):`, input);
    
    // Just emit the event for logging purposes
    this.status.lastActivity = new Date();
    this.emit('speechProcessed', { input, result: null, type });
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return { ...this.status };
  }

  /**
   * Check if agent is ready for interactions
   */
  isReady(): boolean {
    return this.status.status === 'active';
  }

  /**
   * Create Beyond Presence session using direct API call (bypassing problematic SDK)
   */
  private async createBPSessionDirect(): Promise<any> {
    // Generate LiveKit token for the session
    const token = await this.generateAgentToken();
    
    console.log('📝 Creating BP session with:', {
      avatarId: this.config.beyAvatarId,
      livekitUrl: this.config.livekitUrl,
      hasToken: !!token
    });
    
    const response = await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.beyApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        avatar_id: this.config.beyAvatarId,
        livekit_url: this.config.livekitUrl,
        livekit_token: token
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ BP session creation failed:', {
        status: response.status,
        errorText,
        avatarId: this.config.beyAvatarId,
        livekitUrl: this.config.livekitUrl
      });
      throw new Error(`Failed to create BP session: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ BP session created:', {
      sessionId: result.id,
      avatarId: result.avatar_id,
      livekitUrl: result.livekit_url,
      status: result.status,
      createdAt: result.created_at
    });
    return result;
  }

  /**
   * Generate LiveKit token for the agent
   */
  private async generateAgentToken(): Promise<string> {
    const { AccessToken } = await import('livekit-server-sdk');
    
    const token = new AccessToken(
      this.config.livekitApiKey,
      this.config.livekitApiSecret,
      {
        identity: this.config.agentIdentity,
        name: `Beyond Presence Agent`,
      }
    );

    token.addGrant({
      roomJoin: true,
      room: this.config.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();
    
    console.log('🔑 Generated LiveKit token for agent:', {
      identity: this.config.agentIdentity,
      roomName: this.config.roomName,
      hasToken: !!jwt,
      tokenLength: jwt.length
    });
    
    return jwt;
  }

  /**
   * Send initial greeting to participants
   * NOTE: Deprecated - BP avatars respond to LiveKit audio directly
   */
  private async sendGreeting(): Promise<void> {
    console.warn('⚠️ sendGreeting() is deprecated - BP avatars respond to LiveKit audio directly');
    console.log('💬 Greeting not sent via REST - avatar will respond to LiveKit audio');
  }

  /**
   * Generate appropriate greeting based on configuration
   */
  private generateGreeting(): string {
    if (this.config.researchGoal) {
      return `Hello! I'm your AI interviewer. I'm here to learn about ${this.config.researchGoal.toLowerCase()}. I'm ready to begin our conversation whenever you are.`;
    }
    
    return "Hello! I'm your AI interviewer. I'm ready to begin our conversation whenever you are.";
  }

  /**
   * Event handling system
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Shutdown and cleanup the agent
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    try {
      console.log('🛑 Shutting down LiveKit BP Agent Service...');

      // Clean up BP session
      if (this.status.sessionId) {
        try {
          await fetch(`${process.env.BEY_API_URL || 'https://api.bey.dev'}/v1/sessions/${this.status.sessionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.config.beyApiKey}`
            }
          });
        } catch (error) {
          console.warn('⚠️ Failed to cleanup BP session:', error);
        }
      }

      // Clear event handlers
      this.eventHandlers.clear();

      // Reset status
      this.status = {
        isInitialized: false,
        roomName: this.config.roomName,
        agentIdentity: this.config.agentIdentity,
        status: 'idle'
      };

      console.log('✅ LiveKit BP Agent Service shutdown complete');
      this.emit('shutdown');

    } catch (error) {
      console.error('❌ Error during agent shutdown:', error);
      throw error;
    } finally {
      this.isShuttingDown = false;
    }
  }
}

/**
 * Factory function to create a LiveKit BP Agent Service
 */
export async function createLiveKitBPAgentService(config: LiveKitBPAgentConfig): Promise<LiveKitBPAgentService> {
  const agent = new LiveKitBPAgentService(config);
  await agent.initialize();
  return agent;
}

/**
 * Utility function to create agent configuration from environment variables
 */
export function createAgentConfigFromEnv(
  roomName: string,
  agentIdentity: string,
  researchGoal?: string,
  interviewScript?: any,
  systemPrompt?: string
): LiveKitBPAgentConfig {
  return {
    beyApiKey: process.env.BEY_API_KEY!,
    beyAvatarId: process.env.BEY_AVATAR_ID!,
    livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    livekitApiKey: process.env.LIVEKIT_API_KEY!,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET!,
    agentIdentity,
    roomName,
    researchGoal,
    interviewScript,
    systemPrompt: systemPrompt || generateDefaultSystemPrompt(researchGoal)
  };
}

/**
 * Generate default system prompt for interview agent
 */
function generateDefaultSystemPrompt(researchGoal?: string): string {
  const basePrompt = `You are an AI research interviewer conducting a qualitative interview. Your role is to:

1. Ask thoughtful, open-ended questions
2. Listen actively to responses
3. Ask follow-up questions to dig deeper
4. Maintain a professional, friendly tone
5. Keep the conversation flowing naturally

Guidelines:
- Ask one question at a time
- Wait for complete responses before asking follow-ups
- Use "tell me more about..." to encourage elaboration
- Avoid leading questions
- Be empathetic and non-judgmental`;

  if (researchGoal) {
    return `${basePrompt}

Research Goal: ${researchGoal}

Focus your questions on understanding this specific research goal. Tailor your questions to gather insights related to this topic.`;
  }

  return basePrompt;
}
