// app/hooks/useLiveKitBPAgent.ts
// React hook for LiveKit BP Agent integration

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseLiveKitBPAgentConfig {
  roomName: string;
  agentIdentity: string;
  researchGoal?: string;
  interviewScript?: any;
  systemPrompt?: string;
  autoStart?: boolean;
}

export interface AgentStatus {
  isInitialized: boolean;
  isConnected: boolean;
  sessionId?: string;
  roomName: string;
  agentIdentity: string;
  status: 'idle' | 'initializing' | 'ready' | 'active' | 'error';
  lastActivity?: Date;
  error?: string;
}

export interface UseLiveKitBPAgentReturn {
  // Agent state
  agentStatus: AgentStatus | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Agent actions
  createAgent: () => Promise<void>;
  startAgent: () => Promise<void>;
  stopAgent: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  processInput: (input: string) => Promise<void>;
  
  // Event handlers
  onAgentReady: (callback: () => void) => void;
  onParticipantConnected: (callback: (participant: any) => void) => void;
  onParticipantMessage: (callback: (data: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
}

export function useLiveKitBPAgent(config: UseLiveKitBPAgentConfig): UseLiveKitBPAgentReturn {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const agentKeyRef = useRef<string | null>(null);
  const eventHandlersRef = useRef<Map<string, Function[]>>(new Map());

  // Generate agent key
  const agentKey = `${config.roomName}-${config.agentIdentity}`;

  // Auto-start if configured
  useEffect(() => {
    if (config.autoStart && !agentKeyRef.current) {
      createAgent();
    }
  }, [config.autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (agentKeyRef.current) {
        stopAgent();
      }
    };
  }, []);

  const createAgent = useCallback(async () => {
    if (agentKeyRef.current) {
      console.warn('Agent already exists');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🤖 Creating LiveKit BP Agent...');

      const response = await fetch('/api/livekit-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          roomName: config.roomName,
          agentIdentity: config.agentIdentity,
          researchGoal: config.researchGoal,
          interviewScript: config.interviewScript,
          systemPrompt: config.systemPrompt
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create agent');
      }

      const data = await response.json();
      agentKeyRef.current = data.agentKey;
      setAgentStatus(data.status);

      console.log('✅ Agent created:', data.agentKey);

      // Auto-start if configured
      if (config.autoStart) {
        await startAgent();
      }

    } catch (err) {
      console.error('❌ Failed to create agent:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [config, agentKey]);

  const startAgent = useCallback(async () => {
    if (!agentKeyRef.current) {
      throw new Error('Agent not created');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting agent...');

      const response = await fetch('/api/livekit-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          agentKey: agentKeyRef.current
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start agent');
      }

      const data = await response.json();
      setAgentStatus(data.status);

      console.log('✅ Agent started');

      // Trigger ready event
      const readyHandlers = eventHandlersRef.current.get('ready') || [];
      readyHandlers.forEach(handler => handler());

    } catch (err) {
      console.error('❌ Failed to start agent:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopAgent = useCallback(async () => {
    if (!agentKeyRef.current) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('🛑 Stopping agent...');

      const response = await fetch('/api/livekit-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          agentKey: agentKeyRef.current
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Failed to stop agent:', errorData.error);
      }

      agentKeyRef.current = null;
      setAgentStatus(null);
      setError(null);

      console.log('✅ Agent stopped');

    } catch (err) {
      console.error('❌ Failed to stop agent:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!agentKeyRef.current) {
      throw new Error('Agent not created');
    }

    try {
      console.log('📤 Sending message:', message);

      // For now, we'll use the existing BP API
      // In a full implementation, this would be handled by the agent service
      const response = await fetch('/api/beyond-presence/process-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: agentStatus?.sessionId,
          text: message,
          type: 'text'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      console.log('✅ Message sent');

    } catch (err) {
      console.error('❌ Failed to send message:', err);
      throw err;
    }
  }, [agentStatus?.sessionId]);

  const processInput = useCallback(async (input: string) => {
    if (!agentKeyRef.current) {
      throw new Error('Agent not created');
    }

    try {
      console.log('🎤 Processing input:', input);

      // Process through the agent
      await sendMessage(input);

    } catch (err) {
      console.error('❌ Failed to process input:', err);
      throw err;
    }
  }, [sendMessage]);

  // Event handler registration
  const onAgentReady = useCallback((callback: () => void) => {
    if (!eventHandlersRef.current.has('ready')) {
      eventHandlersRef.current.set('ready', []);
    }
    eventHandlersRef.current.get('ready')!.push(callback);
  }, []);

  const onParticipantConnected = useCallback((callback: (participant: any) => void) => {
    if (!eventHandlersRef.current.has('participantConnected')) {
      eventHandlersRef.current.set('participantConnected', []);
    }
    eventHandlersRef.current.get('participantConnected')!.push(callback);
  }, []);

  const onParticipantMessage = useCallback((callback: (data: any) => void) => {
    if (!eventHandlersRef.current.has('participantMessage')) {
      eventHandlersRef.current.set('participantMessage', []);
    }
    eventHandlersRef.current.get('participantMessage')!.push(callback);
  }, []);

  const onError = useCallback((callback: (error: any) => void) => {
    if (!eventHandlersRef.current.has('error')) {
      eventHandlersRef.current.set('error', []);
    }
    eventHandlersRef.current.get('error')!.push(callback);
  }, []);

  return {
    // Agent state
    agentStatus,
    isReady: agentStatus?.status === 'active' && agentStatus?.isConnected || false,
    isLoading,
    error,
    
    // Agent actions
    createAgent,
    startAgent,
    stopAgent,
    sendMessage,
    processInput,
    
    // Event handlers
    onAgentReady,
    onParticipantConnected,
    onParticipantMessage,
    onError
  };
}
