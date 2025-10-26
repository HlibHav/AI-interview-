// app/components/LiveKitAgentDemo.tsx
// Demo component showing how to use the LiveKit BP Agent

"use client";

import React, { useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Bot, Play, Square } from "lucide-react";
import { useLiveKitBPAgent } from "../hooks/useLiveKitBPAgent";

interface LiveKitAgentDemoProps {
  roomName: string;
  agentIdentity: string;
  researchGoal?: string;
  interviewScript?: any;
  onDisconnect?: () => void;
}

export default function LiveKitAgentDemo({
  roomName,
  agentIdentity,
  researchGoal,
  interviewScript,
  onDisconnect
}: LiveKitAgentDemoProps) {
  const [userMessage, setUserMessage] = useState("");
  const [conversationMessages, setConversationMessages] = useState<Array<{
    type: 'user' | 'agent';
    content: string;
    timestamp: string;
  }>>([]);

  const {
    agentStatus,
    isReady,
    isLoading,
    error,
    createAgent,
    startAgent,
    stopAgent,
    sendMessage,
    processInput,
    onAgentReady,
    onParticipantConnected,
    onParticipantMessage,
    onError
  } = useLiveKitBPAgent({
    roomName,
    agentIdentity,
    researchGoal,
    interviewScript,
    autoStart: false
  });

  // Set up event handlers
  useEffect(() => {
    onAgentReady(() => {
      console.log('🎉 Agent is ready!');
      setConversationMessages(prev => [...prev, {
        type: 'agent',
        content: 'Hello! I\'m your AI interviewer. I\'m ready to begin our conversation.',
        timestamp: new Date().toISOString()
      }]);
    });

    onParticipantConnected((participant) => {
      console.log('👤 Participant connected:', participant);
      setConversationMessages(prev => [...prev, {
        type: 'agent',
        content: `Participant ${participant.identity} has joined the room.`,
        timestamp: new Date().toISOString()
      }]);
    });

    onParticipantMessage((data) => {
      console.log('💬 Participant message:', data);
      setConversationMessages(prev => [...prev, {
        type: 'agent',
        content: `Received: ${data.message}`,
        timestamp: new Date().toISOString()
      }]);
    });

    onError((error) => {
      console.error('❌ Agent error:', error);
      setConversationMessages(prev => [...prev, {
        type: 'agent',
        content: `Error: ${error.error || 'Unknown error occurred'}`,
        timestamp: new Date().toISOString()
      }]);
    });
  }, [onAgentReady, onParticipantConnected, onParticipantMessage, onError]);

  const handleCreateAgent = async () => {
    try {
      await createAgent();
    } catch (err) {
      console.error('Failed to create agent:', err);
    }
  };

  const handleStartAgent = async () => {
    try {
      await startAgent();
    } catch (err) {
      console.error('Failed to start agent:', err);
    }
  };

  const handleStopAgent = async () => {
    try {
      await stopAgent();
      setConversationMessages([]);
    } catch (err) {
      console.error('Failed to stop agent:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !isReady) return;

    try {
      // Add user message to conversation
      setConversationMessages(prev => [...prev, {
        type: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      }]);

      // Send to agent
      await processInput(userMessage);
      setUserMessage("");
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'ready': return 'text-blue-500';
      case 'initializing': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'ready': return 'Ready';
      case 'initializing': return 'Initializing...';
      case 'error': return 'Error';
      default: return 'Idle';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center">
              <Bot className="w-8 h-8 mr-3" />
              LiveKit BP Agent Demo
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(agentStatus?.status)}`}></div>
              <span className="text-sm">
                {getStatusText(agentStatus?.status)}
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-300 mb-4">
            <div>Room: <span className="font-medium">{roomName}</span></div>
            <div>Agent: <span className="font-medium">{agentIdentity}</span></div>
            {researchGoal && (
              <div>Research Goal: <span className="font-medium">{researchGoal}</span></div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center"
              onClick={handleCreateAgent}
              disabled={isLoading || !!agentStatus}
            >
              <Bot className="w-4 h-4 mr-2" />
              Create Agent
            </button>

            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center"
              onClick={handleStartAgent}
              disabled={isLoading || !agentStatus || agentStatus.status === 'active'}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Agent
            </button>

            <button
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center"
              onClick={handleStopAgent}
              disabled={isLoading || !agentStatus}
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Agent
            </button>
          </div>

          {agentStatus && (
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2">Agent Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Session ID:</span>
                  <div className="font-mono text-xs break-all">{agentStatus.sessionId}</div>
                </div>
                <div>
                  <span className="text-gray-400">Last Activity:</span>
                  <div>{agentStatus.lastActivity ? new Date(agentStatus.lastActivity).toLocaleString() : 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-400">Initialized:</span>
                  <div>{agentStatus.isInitialized ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <span className="text-gray-400">Connected:</span>
                  <div>{agentStatus.isConnected ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Conversation Area */}
          {isReady && (
            <div className="border rounded-lg p-4 h-64 flex flex-col">
              <h3 className="font-semibold mb-2">Conversation</h3>
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {conversationMessages.length === 0 ? (
                  <p className="text-gray-400 text-sm">No messages yet. Start a conversation!</p>
                ) : (
                  conversationMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded ${
                        msg.type === 'user' 
                          ? 'bg-blue-100 ml-8 text-gray-900' 
                          : 'bg-gray-100 mr-8 text-gray-900'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {msg.type === 'user' ? 'You' : 'AI Agent'}
                      </div>
                      <div className="text-sm">{msg.content}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  disabled={!isReady}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!isReady || !userMessage.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Processing...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
