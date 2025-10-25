"use client";

import { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteParticipant, RemoteTrack, RemoteTrackPublication } from "livekit-client";
import { Video, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import BeyondPresenceAvatar from "./BeyondPresenceAvatar";

interface LiveKitRoomProps {
  sessionId: string;
  participantEmail: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  onDisconnect: () => void;
}

export default function LiveKitRoom({
  sessionId,
  participantEmail,
  isMuted,
  isVideoEnabled,
  onDisconnect,
}: LiveKitRoomProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    connectToRoom();
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, []);

  const connectToRoom = async () => {
    try {
      setConnectionStatus("Connecting to room...");
      
      // Create room instance
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log("Connected to room");
        setIsConnected(true);
        setConnectionStatus("Connected");
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from room");
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

      // Connect to room
      const token = await getLiveKitToken(sessionId, participantEmail);
      await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://your-livekit-server.com", token);
      
      setRoom(newRoom);

      // Enable local media
      await enableLocalMedia(newRoom);

    } catch (error) {
      console.error("Failed to connect to room:", error);
      setConnectionStatus("Connection failed");
    }
  };

  const getLiveKitToken = async (sessionId: string, participantEmail: string): Promise<string> => {
    // In a real implementation, this would call your backend to generate a token
    // For now, we'll simulate this
    const response = await fetch("/api/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, participantEmail }),
    });
    
    if (!response.ok) {
      throw new Error("Failed to get LiveKit token");
    }
    
    const { token } = await response.json();
    return token;
  };

  const enableLocalMedia = async (room: Room) => {
    try {
      // Enable camera and microphone
      await room.localParticipant.enableCameraAndMicrophone();
      
      // Attach local video
      if (localVideoRef.current) {
        room.localParticipant.videoTrackPublications.forEach((publication) => {
          if (publication.track) {
            publication.track.attach(localVideoRef.current!);
          }
        });
      }

      // Attach local audio
      if (localAudioRef.current) {
        room.localParticipant.audioTrackPublications.forEach((publication) => {
          if (publication.track) {
            publication.track.attach(localAudioRef.current!);
          }
        });
      }

    } catch (error) {
      console.error("Failed to enable local media:", error);
    }
  };

  const attachVideoTrack = (track: RemoteTrack, participant: RemoteParticipant) => {
    if (remoteVideoRef.current) {
      track.attach(remoteVideoRef.current);
    }
  };

  const attachAudioTrack = (track: RemoteTrack) => {
    if (localAudioRef.current) {
      track.attach(localAudioRef.current);
    }
  };

  const detachVideoTrack = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const toggleMute = async () => {
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(isMuted);
    }
  };

  const toggleVideo = async () => {
    if (room) {
      await room.localParticipant.setCameraEnabled(isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (localAudioRef.current) {
      localAudioRef.current.muted = !isAudioEnabled;
    }
  };

  useEffect(() => {
    if (room) {
      toggleMute();
    }
  }, [isMuted, room]);

  useEffect(() => {
    if (room) {
      toggleVideo();
    }
  }, [isVideoEnabled, room]);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="text-center">
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
          isConnected ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isConnected ? "bg-green-500" : "bg-yellow-500"
          }`}></div>
          {connectionStatus}
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Local Video */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white text-sm font-medium mb-3">You</h3>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <Video className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 flex items-center space-x-2">
              {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
              {!isVideoEnabled && <Video className="w-4 h-4 text-red-500" />}
            </div>
          </div>
        </div>

        {/* AI Avatar Integration */}
        <div className="bg-gray-800 rounded-lg p-4">
          <BeyondPresenceAvatar
            sessionId={sessionId}
            participantEmail={participantEmail}
            isConnected={isConnected}
          />
        </div>
      </div>

      {/* Audio Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            isAudioEnabled ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          {isAudioEnabled ? (
            <Volume2 className="w-6 h-6 text-white" />
          ) : (
            <VolumeX className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Hidden audio element for remote audio */}
      <audio ref={localAudioRef} autoPlay playsInline />
    </div>
  );
}
