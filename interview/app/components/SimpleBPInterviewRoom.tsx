"use client";

import React, { useState, useRef } from 'react';

interface SimpleBPInterviewRoomProps {
  sessionId: string;
  participantEmail?: string;
  researchGoal?: string;
  interviewScript?: any;
  onDisconnect?: () => void;
}

type ConnectionState = 'idle' | 'initializing' | 'connected' | 'error';

export default function SimpleBPInterviewRoom({
  sessionId,
  participantEmail,
  researchGoal,
  interviewScript,
  onDisconnect,
}: SimpleBPInterviewRoomProps) {
  const [state, setState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string>('Ready to start');
  const [agent, setAgent] = useState<any>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  
  const startBtnLock = useRef(false);

  const generateSystemPrompt = (researchGoal?: string, interviewScript?: any): string => {
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
  };

  const start = React.useCallback(async () => {
    if (startBtnLock.current) return;
    startBtnLock.current = true;
    setError(null);

    try {
      setState('initializing');
      setAgentStatus('Creating AI agent...');

      // Step 1: Create BP Agent using our API route (avoids CORS issues)
      console.log("🤖 Creating BP Agent with Create Agent API...");
      const agentResponse = await fetch('/api/beyond-presence/create-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Interview Agent - ${sessionId}`,
          systemPrompt: generateSystemPrompt(researchGoal, interviewScript),
          language: 'en',
          greeting: `Hello! I'm your AI interviewer. I'm here to learn about ${researchGoal || 'your experiences'}. I'm ready to begin our conversation whenever you are.`,
          maxSessionLengthMinutes: 30,
          capabilities: [],
          llm: {
            type: 'openai'
          }
        }),
      });

      if (!agentResponse.ok) {
        const errorData = await agentResponse.json();
        throw new Error(errorData.error || 'Failed to create BP agent');
      }

      const agentData = await agentResponse.json();
      console.log("✅ BP Agent created:", agentData);
      
      // Generate embed URL using the correct Beyond Presence pattern
      const generatedEmbedUrl = `https://bey.chat/${agentData.agent.id}`;
      const generatedConversationUrl = `https://app.bey.chat/conversation/${agentData.agent.id}`;
      
      console.log("🔗 Generated embed URL:", generatedEmbedUrl);
      console.log("🔗 Generated conversation URL:", generatedConversationUrl);
      console.log("🔗 Agent ID:", agentData.agent.id);
      
      setAgent(agentData.agent);
      setEmbedUrl(generatedEmbedUrl);
      setConversationUrl(generatedConversationUrl);
      
      setAgentStatus('Agent created successfully');
      setState('connected');

    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Unknown error');
      setState('error');
    } finally {
      startBtnLock.current = false;
    }
  }, [sessionId, participantEmail, researchGoal, interviewScript]);

  const stop = React.useCallback(async () => {
    setState('idle');
    setError(null);
    setAgentStatus('Disconnected');
    setAgent(null);
    setEmbedUrl(null);
    setConversationUrl(null);
  }, []);

  const disconnect = async () => {
    await stop();
    onDisconnect?.();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-4">
          <h1 className="text-2xl font-bold mb-4">Simple AI Interview Room</h1>
          <div className="text-sm text-gray-300 mb-4">
            State: <span className="font-medium">{state}</span>
            {error && <span className="text-red-400"> · {error}</span>}
          </div>
          <div className="text-sm text-gray-300 mb-4">
            Agent Status: <span className="font-medium">{agentStatus}</span>
          </div>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium" 
              onClick={start} 
              disabled={state !== 'idle' && state !== 'error'}
            >
              {state === 'connected' ? 'Agent Ready' : 'Start Interview'}
            </button>
            <button
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium" 
              onClick={stop}  
              disabled={state === 'idle'}
            >
              Stop
            </button>
            <button
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium" 
              onClick={disconnect}
            >
              Disconnect
            </button>
          </div>
        </div>

        {state === 'connected' && agent && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">AI Agent Ready</h2>
            
            {embedUrl ? (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Embedded Agent</h3>
                <iframe 
                  src={embedUrl}
                  width="100%" 
                  height="600px"
                  frameBorder="0"
                  allowFullScreen
                  allow="camera; microphone; fullscreen"
                  style={{ border: 'none', maxWidth: '100%' }}
                  title="Beyond Presence Agent"
                />
              </div>
            ) : conversationUrl ? (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Conversation Link</h3>
                <p className="text-gray-300 mb-2">
                  Click the link below to start your conversation with the AI agent:
                </p>
                <a 
                  href={conversationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {conversationUrl}
                </a>
              </div>
            ) : (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Agent Information</h3>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-300 mb-2">
                    <strong>Agent ID:</strong> {agent.id}
                  </p>
                  <p className="text-gray-300 mb-2">
                    <strong>Name:</strong> {agent.name}
                  </p>
                  <p className="text-gray-300 mb-2">
                    <strong>Language:</strong> {agent.language}
                  </p>
                  <p className="text-gray-300 mb-2">
                    <strong>Capabilities:</strong> {agent.capabilities?.map((c: any) => c.type).join(', ') || 'None'}
                  </p>
                  <p className="text-gray-300">
                    <strong>Greeting:</strong> {agent.greeting}
                  </p>
                </div>
                <div className="mt-4 p-4 bg-blue-900 rounded-lg">
                  <p className="text-blue-200 mb-3">
                    <strong>✅ Agent Created Successfully!</strong> Your AI interviewer is ready.
                  </p>
                  <div className="text-blue-200 text-sm space-y-2">
                    <p><strong>Next Steps:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Check the Beyond Presence dashboard for conversation options</li>
                      <li>Use the agent ID to start a conversation via their platform</li>
                      <li>Contact Beyond Presence support for embed URL configuration</li>
                    </ul>
                    <p className="mt-3 text-blue-300">
                      <strong>Agent ID:</strong> {agent.id}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-400">
              <p>Session ID: {sessionId}</p>
              {participantEmail && <p>Participant: {participantEmail}</p>}
              {researchGoal && <p>Research Goal: {researchGoal}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
