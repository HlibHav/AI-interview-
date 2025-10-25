"use client";

import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteParticipant, RemoteTrack, ConnectionState } from "livekit-client";
import { Video, Mic, MicOff, VideoOff, PhoneOff, Bot } from "lucide-react";

interface LiveKitInterviewRoomProps {
  sessionId: string;
  participantEmail: string;
  researchGoal?: string;
  script?: any;
  onDisconnect: () => void;
}

export default function LiveKitInterviewRoom({
  sessionId,
  participantEmail,
  researchGoal,
  script,
  onDisconnect,
}: LiveKitInterviewRoomProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [beyAgentId, setBeyAgentId] = useState<string | null>(null);
  const [beyAvatarUrl, setBeyAvatarUrl] = useState<string | null>(null);
  const [isBeyInitialized, setIsBeyInitialized] = useState(false);
  const [beySessionId, setBeySessionId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Array<{
    type: string;
    content: string;
    timestamp: string;
  }>>([]);
  const [conversationStarted, setConversationStarted] = useState(false);

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
      setConnectionStatus("Initializing interview session...");

      // Get LiveKit token
      const tokenResponse = await fetch("/api/livekit-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: `interview-${sessionId}`,
          participantName: participantEmail || `participant-${Date.now()}`,
          participantMetadata: JSON.stringify({ sessionId, researchGoal }),
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get LiveKit token");
      }

      const { token, roomName } = await tokenResponse.json();

      // Create room instance
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log("Connected to interview room");
        setIsConnected(true);
        setConnectionStatus("Connected - Initializing AI interviewer");
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from interview room");
        setIsConnected(false);
        setConnectionStatus("Disconnected");
        onDisconnect();
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("Participant connected:", participant.identity);
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("Track subscribed:", track.kind, participant.identity);
        if (track.kind === Track.Kind.Video) {
          attachVideoTrack(track as RemoteTrack);
        } else if (track.kind === Track.Kind.Audio) {
          attachAudioTrack(track as RemoteTrack);
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        console.log("Track unsubscribed:", track.kind);
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
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";
      await newRoom.connect(livekitUrl, token);

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
          script,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBeyAgentId(data.agentId);
        setIsBeyInitialized(true);
        setConnectionStatus("AI interviewer ready");

        // Add greeting message to conversation
        if (data.greeting) {
          setConversationMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content: data.greeting,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        // Create a speech-to-video session for the agent
        await createSpeechToVideoSession(data.agentId);
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
      const response = await fetch("/api/beyond-presence/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantEmail: participantEmail || "anonymous",
          agentId,
        }),
      });

      if (response.ok) {
        const sessionData = await response.json();
        console.log("Speech-to-video session created:", sessionData.sessionId);

        // Store the Beyond Presence session ID
        setBeySessionId(sessionData.sessionId);

        // Start listening to the session stream
        startSessionStream(sessionData.sessionId);

        // Auto-start conversation
        setConversationStarted(true);
      } else {
        console.error("Failed to create speech-to-video session:", await response.text());
      }
    } catch (error) {
      console.error("Error creating speech-to-video session:", error);
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
          setConversationMessages((prev) => [
            ...prev,
            {
              type: "ai",
              content: data.text,
              timestamp: data.timestamp,
            },
          ]);
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
    } catch (error) {
      console.error("Failed to enable local media:", error);
    }
  };

  const attachVideoTrack = (track: RemoteTrack) => {
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
          <span className="text-sm">{isBeyInitialized ? "AI Ready" : "Initializing..."}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {/* AI Avatar Video */}
          <div className="relative w-full max-w-2xl aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4">
            {beyAvatarUrl ? (
              <video
                src={beyAvatarUrl}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400">
                    {isBeyInitialized ? "Avatar loading..." : "Initializing AI Avatar..."}
                  </p>
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
        <div className="w-80 bg-gray-800 p-4 flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Conversation</h3>
          <div className="flex-1 bg-white rounded-lg p-3 overflow-y-auto mb-4">
            {conversationMessages.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {isBeyInitialized
                  ? "The interview will begin shortly..."
                  : "Initializing AI interviewer..."}
              </p>
            ) : (
              <div className="space-y-2">
                {conversationMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`text-sm ${
                      message.type === "ai" ? "text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <strong>{message.type === "ai" ? "AI:" : "You:"}</strong>{" "}
                    {message.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center space-x-4">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full ${
            isAudioEnabled
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
          title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${
            isVideoEnabled
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
          title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>

        <button
          onClick={disconnect}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700"
          title="End interview"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

      {/* Status */}
      <div className="bg-gray-700 px-4 py-2 text-center text-sm">{connectionStatus}</div>

      {/* Hidden audio element for remote audio */}
      <audio ref={localAudioRef} autoPlay />
    </div>
  );
}

