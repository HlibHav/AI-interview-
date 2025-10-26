// app/components/ClientLiveKitAgent.tsx
// Client-side LiveKit agent that connects to the server-side BP agent

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from "livekit-client";
import { Bot, Play, Square, Mic, MicOff, Video, VideoOff } from "lucide-react";

interface ClientLiveKitAgentProps {
  roomName: string;
  agentIdentity: string;
  researchGoal?: string;
  onDisconnect?: () => void;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export default function ClientLiveKitAgent({
  roomName,
  agentIdentity,
  researchGoal,
  onDisconnect
}: ClientLiveKitAgentProps) {
  
  const [state, setState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [conversationMessages, setConversationMessages] = useState<Array<{
    type: 'user' | 'agent';
    content: string;
    timestamp: string;
  }>>([]);
  const [userMessage, setUserMessage] = useState("");
  const [agentStatus, setAgentStatus] = useState<string>('Not connected');

  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  const connectToRoom = async () => {
    if (state === 'connecting') return;
    
    setState('connecting');
    setError(null);

    try {
      console.log('🔗 Connecting to LiveKit room:', roomName);

      // Step 1: Create server-side agent
      const agentResponse = await fetch('/api/livekit-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          roomName,
          agentIdentity,
          researchGoal
        }),
      });

      if (!agentResponse.ok) {
        const errorData = await agentResponse.json();
        throw new Error(errorData.error || 'Failed to create agent');
      }

      const agentData = await agentResponse.json();
      console.log('✅ Agent created:', agentData);

      // Step 2: Start the agent
      const startResponse = await fetch('/api/livekit-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          agentKey: agentData.agentKey
        }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.error || 'Failed to start agent');
      }

      console.log('✅ Agent started');

      // Step 3: Get LiveKit token for participant
      const tokenResponse = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName,
          participantName: `participant-${Date.now()}`,
          participantMetadata: JSON.stringify({ 
            type: 'participant',
            researchGoal
          }),
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get LiveKit token');
      }

      const { token } = await tokenResponse.json();

      // Step 4: Connect to LiveKit room
      const { Room: LKRoom } = await import('livekit-client');
      const room = new LKRoom({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up room event handlers
      setupRoomEventHandlers(room);

      // Connect to room
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";
      await room.connect(livekitUrl, token);

      roomRef.current = room;
      setState('connected');
      setAgentStatus('Connected - waiting for agent');

      // Step 5: Enable local media
      await enableLocalMedia(room);

      console.log('✅ Connected to LiveKit room');

    } catch (err) {
      console.error('❌ Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
      setAgentStatus('Connection failed');
    }
  };

  const setupRoomEventHandlers = (room: Room) => {
    room.on(RoomEvent.Connected, () => {
      console.log('🔗 Participant connected to room');
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log('🔌 Participant disconnected from room');
      setState('idle');
      setAgentStatus('Disconnected');
      onDisconnect?.();
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('👤 Participant connected:', participant.identity);
      
      // Check if this is the BP agent
      if (participant.identity.startsWith('bey-agent-') || participant.identity === agentIdentity) {
        console.log('🤖 BP Agent joined the room!');
        setAgentStatus('AI agent connected');
      }
      
      setParticipants(prev => [...prev, participant]);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('👤 Participant disconnected:', participant.identity);
      setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('📡 Track subscribed:', {
        trackKind: track.kind,
        participant: participant.identity,
        isBeyAgent: participant.identity.startsWith('bey-agent-') || participant.identity === agentIdentity
      });
      
      if (track.kind === Track.Kind.Video) {
        attachVideoTrack(track as RemoteTrack, participant);
      } else if (track.kind === Track.Kind.Audio) {
        attachAudioTrack(track as RemoteTrack);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log('📡 Track unsubscribed:', {
        trackKind: track.kind,
        participant: participant.identity
      });

      if (track.kind === Track.Kind.Video) {
        detachVideoTrack();
      }
    });

    room.on(RoomEvent.DataReceived, (payload, participant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        console.log('📨 Data received:', data);
        
        // Handle different types of data from the agent
        if (data.type === 'agent_message') {
          setConversationMessages(prev => [...prev, {
            type: 'agent',
            content: data.message,
            timestamp: new Date().toISOString()
          }]);
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse data:', error);
      }
    });
  };

  const attachVideoTrack = (track: RemoteTrack, participant: RemoteParticipant) => {
    console.log('📹 Attaching video track:', {
      participant: participant.identity,
      isBeyAgent: participant.identity.startsWith('bey-agent-') || participant.identity === agentIdentity,
      hasVideoRef: !!remoteVideoRef.current
    });
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = track.mediaStream!;
      console.log('✅ Video track attached to element');
      
      if (participant.identity.startsWith('bey-agent-') || participant.identity === agentIdentity) {
        console.log('✅ BP agent video track attached - avatar ready');
        setAgentStatus('AI agent ready');
      }
    }
  };

  const attachAudioTrack = (track: RemoteTrack) => {
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = track.mediaStream!;
    }
  };

  const detachVideoTrack = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const enableLocalMedia = async (room: Room) => {
    try {
      await room.localParticipant.enableCameraAndMicrophone();
      
      const localVideoTrack = room.localParticipant.videoTrackPublications.values().next().value?.track;
      if (localVideoTrack && localVideoRef.current) {
        localVideoRef.current.srcObject = localVideoTrack.mediaStream!;
      }
      
      console.log('✅ Local media enabled');
    } catch (error) {
      console.error('❌ Failed to enable local media:', error);
    }
  };

  const sendMessage = async (message: string) => {
    if (!roomRef.current || !message.trim()) return;

    try {
      // Send via LiveKit data channel
      const payload = {
        type: "user_message",
        text: message,
        timestamp: Date.now()
      };
      
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      await roomRef.current.localParticipant.publishData(bytes, { reliable: true });

      // Add to conversation
      setConversationMessages(prev => [...prev, {
        type: "user",
        content: message,
        timestamp: new Date().toISOString()
      }]);

      setUserMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const toggleMute = async () => {
    if (roomRef.current) {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = async () => {
    if (roomRef.current) {
      await roomRef.current.localParticipant.setCameraEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const disconnect = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setState('idle');
    setError(null);
    setAgentStatus('Disconnected');
    setParticipants([]);
    setConversationMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center">
              <Bot className="w-8 h-8 mr-3" />
              Client LiveKit Agent
            </h1>
            <div className="text-sm text-gray-300">
              Status: <span className="font-medium">{agentStatus}</span>
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
              onClick={connectToRoom}
              disabled={state === 'connecting'}
            >
              <Play className="w-4 h-4 mr-2" />
              {state === 'connecting' ? 'Connecting...' : 'Connect'}
            </button>

            <button
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center"
              onClick={disconnect}
              disabled={state === 'idle'}
            >
              <Square className="w-4 h-4 mr-2" />
              Disconnect
            </button>
          </div>

          {state === 'connected' && (
            <div className="flex flex-col gap-4">
              {/* Video elements */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    className="w-full h-48 bg-gray-900 rounded-lg"
                  />
                  <div className="absolute bottom-2 left-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                    You
                  </div>
                </div>
                <div className="relative">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    className="w-full h-48 bg-gray-900 rounded-lg"
                  />
                  <div className="absolute bottom-2 left-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                    AI Avatar
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full text-white ${isAudioEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600'}`}
                >
                  {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full text-white ${isVideoEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'}`}
                >
                  {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>

              {/* Chat */}
              <div className="border rounded-lg p-4 h-64 flex flex-col">
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
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage(userMessage)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                  <button
                    onClick={() => sendMessage(userMessage)}
                    disabled={!userMessage.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden audio element for remote audio */}
      <audio ref={localAudioRef} autoPlay />
    </div>
  );
}
