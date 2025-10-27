"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  const [transcript, setTranscript] = useState<any[]>([]);
  const [beyAgentId, setBeyAgentId] = useState<string | null>(null);
  const beyAgentIdRef = useRef<string | null>(null);
  const exportInFlightRef = useRef(false);
  const exportCompletedRef = useRef(false);
  const startBtnLock = useRef(false);

  // Function to add conversation entry to transcript
  const addToTranscript = (speaker: string, text: string) => {
    const entry = {
      speaker,
      text,
      timestamp: new Date().toISOString()
    };
    setTranscript(prev => [...prev, entry]);
    console.log('📝 Added to transcript:', entry);
  };

  // Simulate conversation for testing
  const simulateConversation = () => {
    if (researchGoal?.toLowerCase().includes('parent') || researchGoal?.toLowerCase().includes('child')) {
      const conversation = [
        { speaker: 'ai', text: 'Hello! Thank you for participating. Can you tell me about your experience as a young parent?' },
        { speaker: 'participant', text: 'I became a parent at 22, and it was both exciting and overwhelming. The biggest challenge was balancing work, personal life, and caring for my child.' },
        { speaker: 'ai', text: 'What specific aspects of parenting did you find most challenging?' },
        { speaker: 'participant', text: 'Sleep deprivation was huge. Also, knowing when to seek medical advice versus handling things myself. I constantly questioned if I was doing things right.' },
        { speaker: 'ai', text: 'How did you build your confidence as a parent?' },
        { speaker: 'participant', text: 'I joined a local parenting group and connected with other young parents online. Having a community who understood what I was going through made a huge difference.' },
        { speaker: 'ai', text: 'What advice would you give to other young parents?' },
        { speaker: 'participant', text: 'Trust your instincts, but don\'t be afraid to ask for help. Find your support network early - whether it\'s family, friends, or parent groups.' }
      ];
      
      conversation.forEach((entry, index) => {
        setTimeout(() => {
          addToTranscript(entry.speaker, entry.text);
        }, index * 2000); // Add each entry every 2 seconds
      });
    }
  };

  // Function to update session transcript
  const updateSessionTranscript = useCallback(
    async (overrides?: { entries?: any[]; agentId?: string }) => {
    try {
      console.log('🛰️ [SIMPLE ROOM] Updating transcript via /api/sessions/update-transcript', {
        sessionId,
        entries: overrides?.entries ? overrides.entries.length : transcript.length,
        hasBeyAgentId: Boolean(overrides?.agentId || beyAgentId || beyAgentIdRef.current)
      });

      const transcriptPayload = overrides?.entries ?? transcript;
      const agentIdPayload = overrides?.agentId ?? beyAgentId ?? beyAgentIdRef.current;

      const response = await fetch('/api/sessions/update-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          transcript: transcriptPayload,
          beyondPresenceAgentId: agentIdPayload
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [SIMPLE ROOM] Transcript update succeeded', {
          updatedEntries: transcript.length,
          sessionStatus: result.session?.status
        });
      } else {
        const errorText = await response.text();
        console.error('❌ [SIMPLE ROOM] Transcript update failed', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
      }
    } catch (error) {
      console.error('❌ [SIMPLE ROOM] Error updating transcript:', error);
    }
  }, [sessionId, transcript, beyAgentId]);

  const triggerTranscriptExport = useCallback(
    async (reason: string) => {
      if (exportInFlightRef.current) {
        console.log('ℹ️ [SIMPLE ROOM] Export already in flight, skipping duplicate trigger', {
          reason,
          sessionId
        });
        return;
      }

      exportInFlightRef.current = true;
      try {
        const agentIdentifier = beyAgentIdRef.current || beyAgentId;
        const payload: Record<string, any> = { sessionId };
        if (agentIdentifier) {
          payload.beyAgentId = agentIdentifier;
        }

        console.log('🛰️ [SIMPLE ROOM] Triggering Beyond Presence transcript export', {
          reason,
          hasAgentId: Boolean(agentIdentifier),
          sessionId
        });

        const response = await fetch('/api/beyond-presence/export-transcript', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const exportPayload = await response.json();
        console.log('🛰️ [SIMPLE ROOM] Export attempt result', {
          reason,
          status: response.status,
          ok: response.ok,
          exportPayload
        });

        if (response.ok) {
          exportCompletedRef.current = true;
        }
      } catch (exportError) {
        console.error('⚠️ [SIMPLE ROOM] Export attempt failed', {
          reason,
          error: exportError
        });
      } finally {
        exportInFlightRef.current = false;
      }
    },
    [beyAgentId, sessionId]
  );

  // Function to complete session with real data
  const completeSession = async () => {
    try {
      setAgentStatus('Completing session...');
      if (transcript.length === 0) {
        console.warn('⚠️ [SIMPLE ROOM] Local transcript is empty before completion');
      }
      console.log('🟡 [SIMPLE ROOM] Completing session', {
        sessionId,
        localEntries: transcript.length
      });
      
      // First persist the transcript (even if empty) and agent metadata
      await updateSessionTranscript();
      
      // Then complete the session
      const response = await fetch('/api/sessions/real-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [SIMPLE ROOM] Session completed with real data', result);
        setAgentStatus('Session completed successfully!');

        await triggerTranscriptExport('session-complete');

        // Show completion message
        alert('Interview completed! Check the admin dashboard for insights and analysis.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete session');
      }
    } catch (error) {
      console.error('❌ [SIMPLE ROOM] Error completing session:', error);
      setError(`Failed to complete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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

    let prompt = basePrompt;

    if (researchGoal) {
      prompt += `

Research Goal: ${researchGoal}

Focus your questions on understanding this specific research goal. Tailor your questions to gather insights related to this topic.`;
    }

    // If we have an interview script, incorporate it into the prompt
    if (interviewScript) {
      prompt += `

Interview Script:
${interviewScript.introduction || "Welcome to our research interview."}

Questions to cover:`;
      
      if (interviewScript.questions && interviewScript.questions.length > 0) {
        interviewScript.questions.forEach((q: any, idx: number) => {
          prompt += `
${idx + 1}. ${q.text}${q.topic ? ` (Topic: ${q.topic})` : ""}`;
        });
      }

      if (interviewScript.followUps) {
        prompt += `

Follow-up questions for deeper exploration:`;
        Object.entries(interviewScript.followUps).forEach(([questionId, followUps]: [string, any]) => {
          if (Array.isArray(followUps) && followUps.length > 0) {
            prompt += `
For question ${questionId}: ${followUps.join(", ")}`;
          }
        });
      }

      prompt += `

Follow this script but feel free to ask follow-up questions based on the participant's responses. Adapt the conversation naturally while covering all the planned topics.`;
    }

    return prompt;
  };

  const start = useCallback(async () => {
    if (startBtnLock.current) return;
    startBtnLock.current = true;
    setError(null);
    exportCompletedRef.current = false;
    exportInFlightRef.current = false;

    try {
      setState('initializing');
      setAgentStatus('Creating AI agent...');

      // Debug: Log the script data being passed
      console.log("🔍 Script data received:", {
        hasScript: !!interviewScript,
        scriptType: typeof interviewScript,
        scriptKeys: interviewScript ? Object.keys(interviewScript) : [],
        scriptContent: interviewScript
      });

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
      setBeyAgentId(agentData.agent.id);
      beyAgentIdRef.current = agentData.agent.id;
      console.log('✅ [SIMPLE ROOM] Stored Beyond Presence agent info', {
        agentId: agentData.agent.id
      });

      // Persist agent metadata even before transcript entries exist
      void updateSessionTranscript({
        entries: transcript,
        agentId: agentData.agent.id
      });

      setAgentStatus('Agent created successfully');
      setState('connected');

    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Unknown error');
      setState('error');
    } finally {
      startBtnLock.current = false;
    }
  }, [sessionId, researchGoal, interviewScript, updateSessionTranscript, transcript]);

  const stop = useCallback(async () => {
    if (beyAgentIdRef.current || beyAgentId) {
      await triggerTranscriptExport('manual-stop');
    } else {
      console.warn('ℹ️ [SIMPLE ROOM] No Beyond Presence agent identifier available during stop');
    }

    setState('idle');
    setError(null);
    setAgentStatus('Disconnected');
    setAgent(null);
    setEmbedUrl(null);
    setConversationUrl(null);
    setBeyAgentId(null);
    beyAgentIdRef.current = null;
    console.log('ℹ️ [SIMPLE ROOM] Interview stopped, local state reset');
  }, [triggerTranscriptExport, beyAgentId]);

  const disconnect = async () => {
    await stop();
    onDisconnect?.();
  };

  useEffect(() => {
    return () => {
      if (!exportCompletedRef.current) {
        void triggerTranscriptExport('component-unmount');
      }
    };
  }, [triggerTranscriptExport]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBeforeUnload = () => {
      if (exportCompletedRef.current) {
        return;
      }

      const agentIdentifier = beyAgentIdRef.current || beyAgentId;
      if (!agentIdentifier) {
        return;
      }

      const payload = JSON.stringify({
        sessionId,
        beyAgentId: agentIdentifier
      });

      try {
        const endpoint = `${window.location.origin}/api/beyond-presence/export-transcript`;
        const blob = new Blob([payload], { type: 'application/json' });
        const success = navigator.sendBeacon(endpoint, blob);
        console.log('📡 [SIMPLE ROOM] sendBeacon export attempt before unload', {
          success,
          sessionId
        });
      } catch (error) {
        console.warn('⚠️ [SIMPLE ROOM] sendBeacon export failed', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [beyAgentId, sessionId]);

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
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium" 
              onClick={completeSession}
            >
              Complete Interview
            </button>
            <button
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium" 
              onClick={simulateConversation}
              disabled={transcript.length > 0}
            >
              Simulate Conversation
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

            {/* Live Transcript Display */}
            {transcript.length > 0 && (
              <div className="mt-6 bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Live Transcript ({transcript.length} exchanges)</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {transcript.map((entry, index) => (
                    <div key={index} className={`p-2 rounded ${
                      entry.speaker === 'ai' ? 'bg-blue-900' : 'bg-green-900'
                    }`}>
                      <div className="text-xs text-gray-400 mb-1">
                        {entry.speaker === 'ai' ? 'AI Interviewer' : 'Participant'} - {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-sm">{entry.text}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  💡 Tip: Use the "Complete Interview" button when you're done to generate insights and analysis.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
