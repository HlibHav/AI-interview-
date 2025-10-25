"use client";

import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteParticipant, RemoteTrack, RemoteTrackPublication } from "livekit-client";
import { Video, Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Bot, VideoOff } from "lucide-react";
import BeyondPresenceAvatar from "./BeyondPresenceAvatar";

interface AIInterviewRoomProps {
  sessionId: string;
  participantEmail: string;
  researchGoal?: string;
  onDisconnect: () => void;
}

export default function AIInterviewRoom({
  sessionId,
  participantEmail,
  researchGoal,
  onDisconnect,
}: AIInterviewRoomProps) {
  
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [aiAgentConnected, setAiAgentConnected] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    connectToRoom();
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  const connectToRoom = async () => {
    try {
      setConnectionStatus("Starting interview session...");
      
      // Start the interview session
      const response = await fetch("/api/interview-session/start", {
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
        
        // Check if this is the AI agent
        if (participant.identity.includes("ai-interviewer")) {
          setAiAgentConnected(true);
          setConnectionStatus("AI interviewer is ready");
        }
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("Participant disconnected:", participant.identity);
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
        
        if (participant.identity.includes("ai-interviewer")) {
          setAiAgentConnected(false);
        }
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

      // Connect to room
      await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://your-livekit-server.com", participantToken);
      
      roomRef.current = newRoom;

      // Enable local media
      await enableLocalMedia(newRoom);

    } catch (error) {
      console.error("Failed to connect to interview room:", error);
      setConnectionStatus("Connection failed");
    }
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
      await roomRef.current.disconnect();
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
            {aiAgentConnected ? "AI Ready" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {/* Remote Video (AI Avatar) */}
          <div className="relative w-full max-w-2xl aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {!aiAgentConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400">Waiting for AI interviewer...</p>
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

        {/* Chat/Avatar Area */}
        <div className="w-80 bg-gray-800 p-4">
          <BeyondPresenceAvatar
            sessionId={sessionId}
            participantEmail={participantEmail}
            isConnected={isConnected}
          />
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
