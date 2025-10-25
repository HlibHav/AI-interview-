"use client";

import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteParticipant, RemoteTrack, RemoteTrackPublication, ConnectionState } from "livekit-client";
import { Video, Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Bot, VideoOff } from "lucide-react";

interface BeyondPresenceInterviewRoomProps {
  sessionId: string;
  participantEmail: string;
  researchGoal?: string;
  onDisconnect: () => void;
}

export default function BeyondPresenceInterviewRoom({
  sessionId,
  participantEmail,
  researchGoal,
  onDisconnect,
}: BeyondPresenceInterviewRoomProps) {
  
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [beyAgentId, setBeyAgentId] = useState<string | null>(null);
  const [beyAvatarUrl, setBeyAvatarUrl] = useState<string | null>(null);
  const [isBeyInitialized, setIsBeyInitialized] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [conversationMessages, setConversationMessages] = useState<Array<{type: string, content: string, timestamp: string}>>([]);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [beySessionId, setBeySessionId] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const beyStreamRef = useRef<EventSource | null>(null);

  useEffect(() => {
    connectToRoom();
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (beyStreamRef.current) {
        beyStreamRef.current.close();
      }
    };
  }, []);

  const connectToRoom = async () => {
    try {
      setConnectionStatus("Starting interview session...");
      
      // Start the interview session
      const response = await fetch("/api/direct-interview/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantEmail,
          researchGoal,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start interview session");
      }

      const { participantToken, roomName } = await response.json();
      
      // Create room instance
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log("Connected to interview room");
        setIsConnected(true);
        setConnectionStatus("Connected to AI interviewer");
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from interview room");
        setIsConnected(false);
        setConnectionStatus("Disconnected");
        onDisconnect();
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("Participant connected:", participant.identity);
        setParticipants(prev => [...prev, participant]);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("Participant disconnected:", participant.identity);
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("Track subscribed:", track.kind, participant.identity);
        if (track.kind === Track.Kind.Video) {
          attachVideoTrack(track as RemoteTrack, participant);
        } else if (track.kind === Track.Kind.Audio) {
          attachAudioTrack(track as RemoteTrack);
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log("Track unsubscribed:", track.kind, participant.identity);
        if (track.kind === Track.Kind.Video) {
          detachVideoTrack();
        }
      });

      // Handle DataChannel errors gracefully
      newRoom.on(RoomEvent.DataChannelError, (error) => {
        console.warn("DataChannel error (non-critical):", error);
        // Don't disconnect on DataChannel errors as they're often non-critical
      });

      // Handle connection errors
      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("Connection state changed:", state);
        if (state === ConnectionState.Disconnected) {
          setIsConnected(false);
          setConnectionStatus("Disconnected");
        }
      });

      // Connect to room
      await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://monitizorcoach-mf45xk0u.livekit.cloud", participantToken);
      
      roomRef.current = newRoom;

      // Enable local media
      await enableLocalMedia(newRoom);

      // Initialize Beyond Presence
      await initializeBeyondPresence();

    } catch (error) {
      console.error("Failed to connect to interview room:", error);
      setConnectionStatus("Connection failed");
    }
  };

  const initializeBeyondPresence = async () => {
    try {
      setConnectionStatus("Initializing AI avatar...");
      
      const response = await fetch("/api/beyond-presence/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          participantEmail,
          researchGoal,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBeyAgentId(data.agentId);
        setIsBeyInitialized(true);
        setConnectionStatus("AI avatar ready");
        
        // Add greeting message to conversation
        if (data.greeting) {
          setConversationMessages(prev => [...prev, {
            type: "ai",
            content: data.greeting,
            timestamp: new Date().toISOString()
          }]);
        }
        
        // Set avatar URL based on avatar ID
        if (data.avatarId) {
          console.log("Setting avatar URL for avatar ID:", data.avatarId);
          // The actual avatar will be streamed via the session
          // For now, we'll show a placeholder until we get the video stream
          setBeyAvatarUrl(null); // We'll get the video URL from the session stream
        }
        
        // Create a speech-to-video session for the agent
        await createSpeechToVideoSession(data.agentId);
        
        // Start the conversation by sending the greeting
        await startConversation(data.greeting);
      } else {
        console.error("Failed to initialize Beyond Presence:", await response.text());
        setConnectionStatus("AI avatar initialization failed");
      }
    } catch (error) {
      console.error("Error initializing Beyond Presence:", error);
      setConnectionStatus("AI avatar initialization failed");
    }
  };

  const createSpeechToVideoSession = async (agentId: string) => {
    try {
      const response = await fetch('/api/beyond-presence/create-session', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantEmail: participantEmail || "anonymous"
        }),
      });

      if (response.ok) {
        const sessionData = await response.json();
        console.log("Speech-to-video session created:", sessionData.sessionId);
        console.log("Session data:", sessionData);
        console.log("Avatar ID:", sessionData.avatarId);
        console.log("Transport type:", sessionData.transportType);
        
        // Store the Beyond Presence session ID
        setBeySessionId(sessionData.sessionId);
        
        // Start listening to the session stream
        startSessionStream(sessionData.sessionId);
      } else {
        console.error("Failed to create speech-to-video session:", await response.text());
      }
    } catch (error) {
      console.error("Error creating speech-to-video session:", error);
    }
  };

  const sendTextMessage = async (message: string) => {
    if (!message.trim()) return;
    
    if (!beySessionId) {
      console.error("Beyond Presence session ID not available");
      return;
    }
    
    // Add user message to conversation
    setConversationMessages(prev => [...prev, {
      type: "user",
      content: message,
      timestamp: new Date().toISOString()
    }]);
    setConversationStarted(true);
    
    try {
      const response = await fetch('/api/beyond-presence/process-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: beySessionId,
          transcript: message,
          participantEmail
        }),
      });

      if (response.ok) {
        console.log("Message sent successfully");
      } else {
        console.error("Failed to send message:", await response.text());
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const startConversation = async (greeting?: string) => {
    if (!beyAgentId) return;
    
    try {
      console.log("Starting conversation with agent:", beyAgentId);
      console.log("Using session ID:", beySessionId || sessionId);
      console.log("Beyond Presence session ID:", beySessionId);
      console.log("LiveKit session ID:", sessionId);
      
      if (!beySessionId) {
        console.error("Beyond Presence session ID not available yet");
        return;
      }
      
      // Send initial greeting to start the conversation
      const response = await fetch('/api/beyond-presence/process-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: beySessionId,
          transcript: greeting || "Hello, I'm ready to start the interview.",
          participantEmail
        }),
      });

      if (response.ok) {
        console.log("Conversation started successfully");
        const result = await response.json();
        console.log("Conversation result:", result);
        setConversationStarted(true);
      } else {
        console.error("Failed to start conversation:", await response.text());
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const startSessionStream = (sessionId: string) => {
    console.log("Starting session stream for:", sessionId);
    const stream = new EventSource(`/api/beyond-presence/stream/${sessionId}`);
    beyStreamRef.current = stream;

    stream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "audio" && data.audioUrl) {
          // Play audio response
          const audio = new Audio(data.audioUrl);
          audio.play();
        }
        
        if (data.type === "text" && data.text) {
          // Add text to conversation
          setConversationMessages(prev => [...prev, {
            type: "ai",
            content: data.text,
            timestamp: data.timestamp
          }]);
        }
        
        if (data.type === "video" && data.videoUrl) {
          // Update avatar video
          console.log("Received video URL:", data.videoUrl);
          setBeyAvatarUrl(data.videoUrl);
        }
        
        if (data.type === "error") {
          console.error("Beyond Presence stream error:", data.message);
        }
      } catch (error) {
        console.error("Error parsing Beyond Presence stream data:", error);
      }
    };

    stream.onerror = (error) => {
      console.error("Beyond Presence stream error:", error);
    };
  };

  const enableLocalMedia = async (room: Room) => {
    try {
      // Enable camera and microphone
      await room.localParticipant.enableCameraAndMicrophone();
      
      // Attach local video
      if (localVideoRef.current) {
        room.localParticipant.videoTrackPublications.forEach((publication) => {
          if (publication.track) {
            localVideoRef.current!.srcObject = publication.track.mediaStream!;
          }
        });
      }

      // Set up audio input monitoring for Beyond Presence
      setupAudioInputMonitoring(room);
    } catch (error) {
      console.error("Failed to enable local media:", error);
    }
  };

  const setupAudioInputMonitoring = (room: Room) => {
    // Monitor audio input and send to Beyond Presence
    room.localParticipant.audioTrackPublications.forEach((publication) => {
      if (publication.track) {
        const audioTrack = publication.track;
        console.log("Audio track available for Beyond Presence");
        
        // Create a MediaRecorder to capture audio and send to Beyond Presence
        const mediaRecorder = new MediaRecorder(audioTrack.mediaStream!, {
          mimeType: 'audio/webm;codecs=opus'
        });

        let audioChunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          await sendAudioToBeyondPresence(audioBlob);
          audioChunks = [];
        };

        // Start recording in chunks
        mediaRecorder.start(1000); // Record 1-second chunks
        
        // Store the recorder for cleanup
        (room as any).beyMediaRecorder = mediaRecorder;
      }
    });
  };

  const sendAudioToBeyondPresence = async (audioBlob: Blob) => {
    if (!beyAgentId) return;

    try {
      setIsProcessingAudio(true);
      console.log("Sending audio to Beyond Presence, size:", audioBlob.size);
      
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send audio to Beyond Presence for processing
      const response = await fetch('/api/beyond-presence/process-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: beySessionId,
          audioData: base64Audio,
          participantEmail,
          mimeType: 'audio/webm'
        }),
      });

      if (response.ok) {
        console.log("Audio sent to Beyond Presence successfully");
        const result = await response.json();
        console.log("Audio processing result:", result);
      } else {
        console.error("Failed to send audio to Beyond Presence:", await response.text());
      }
    } catch (error) {
      console.error("Error sending audio to Beyond Presence:", error);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const attachVideoTrack = (track: RemoteTrack, participant: RemoteParticipant) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = track.mediaStream!;
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
      // Stop the Beyond Presence media recorder
      if ((roomRef.current as any).beyMediaRecorder) {
        (roomRef.current as any).beyMediaRecorder.stop();
      }
      await roomRef.current.disconnect();
    }
    if (beyStreamRef.current) {
      beyStreamRef.current.close();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">AI Research Interview</h1>
          <p className="text-sm text-gray-300">
            {researchGoal || "General user research and product validation"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5" />
          <span className="text-sm">
            {isBeyInitialized ? "AI Ready" : "Initializing..."}
          </span>
          {beyAgentId && (
            <span className="text-xs text-gray-400">
              (Agent: {beyAgentId.substring(0, 8)}...)
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {/* Beyond Presence Avatar */}
          <div className="relative w-full max-w-2xl aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4">
            {beyAvatarUrl ? (
              <video
                src={beyAvatarUrl}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                controls={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400 mb-2">
                    {isBeyInitialized ? "Avatar loading..." : "Initializing AI Avatar..."}
                  </p>
                  {beyAgentId && (
                    <p className="text-xs text-gray-500">
                      Agent ID: {beyAgentId.substring(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Local Video */}
          <div className="relative w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
              You
            </div>
          </div>
        </div>

        {/* Conversation Sidebar */}
        <div className="w-80 bg-gray-800 p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">AI Interviewer</h3>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-sm">
                  {isBeyInitialized ? "Ready" : "Initializing..."}
                </span>
              </div>
              {beyAgentId && (
                <p className="text-xs text-gray-400 mb-1">Agent ID: {beyAgentId.substring(0, 8)}...</p>
              )}
              <div className="text-xs text-gray-500">
                <p>Status: {connectionStatus}</p>
                {beyAvatarUrl && <p>Avatar: Loaded</p>}
                {!beyAvatarUrl && isBeyInitialized && <p>Avatar: Waiting for video stream...</p>}
                {isProcessingAudio && <p className="text-blue-400">🎤 Processing audio...</p>}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Conversation</h3>
            
            {/* Start Conversation Button */}
            {!conversationStarted && isBeyInitialized && (
              <div className="mb-3">
                <button
                  onClick={() => startConversation()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  🎤 Start Conversation
                </button>
              </div>
            )}
            
            <div className="bg-white rounded-lg p-3 h-64 overflow-y-auto">
              {conversationMessages.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {isBeyInitialized ? "Click 'Start Conversation' to begin" : "Initializing AI interviewer..."}
                </p>
              ) : (
                <div className="space-y-2">
                  {conversationMessages.map((message, index) => (
                    <div key={index} className={`text-sm ${message.type === 'ai' ? 'text-blue-600' : 'text-gray-700'}`}>
                      <strong>{message.type === 'ai' ? 'AI:' : 'You:'}</strong> {message.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center space-x-4">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full ${
            isAudioEnabled ? "bg-red-600 hover:bg-red-700" : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${
            isVideoEnabled ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>

        <button
          onClick={disconnect}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

      {/* Status */}
      <div className="bg-gray-700 px-4 py-2 text-center text-sm">
        {connectionStatus}
      </div>

      {/* Hidden audio element for remote audio */}
      <audio ref={localAudioRef} autoPlay />
    </div>
  );
}
