"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, MessageSquare, Volume2, VolumeX } from "lucide-react";

// Extend Window interface for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface BeyondPresenceAvatarProps {
  sessionId: string;
  participantEmail: string;
  isConnected: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function BeyondPresenceAvatar({ 
  sessionId, 
  participantEmail, 
  isConnected 
}: BeyondPresenceAvatarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isConnected) {
      initializeBeyondPresence();
      initializeSpeechRecognition();
    }
  }, [isConnected]);

  const initializeBeyondPresence = async () => {
    try {
      // Initialize Beyond Presence connection
      const response = await fetch("/api/beyond-presence/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, participantEmail }),
      });

      if (response.ok) {
        const { avatarUrl, agentId } = await response.json();
        setAvatarUrl(avatarUrl);
        
        // Start listening for AI responses
        startListeningForAIResponses(agentId);
      }
    } catch (error) {
      console.error("Failed to initialize Beyond Presence:", error);
    }
  };

  const initializeSpeechRecognition = () => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          handleUserSpeech(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  };

  const startListeningForAIResponses = (agentId: string) => {
    // Set up WebSocket or polling to receive AI responses
    const eventSource = new EventSource(`/api/beyond-presence/stream/${agentId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "audio") {
        // Play AI audio response
        if (audioRef.current && audioEnabled) {
          audioRef.current.src = data.audioUrl;
          audioRef.current.play();
          setIsSpeaking(true);
          
          audioRef.current.onended = () => {
            setIsSpeaking(false);
          };
        }
      } else if (data.type === "text") {
        // Add AI message to chat
        const message: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.text,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, message]);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
    };
  };

  const handleUserSpeech = async (transcript: string) => {
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: transcript,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Send transcript to Beyond Presence
    try {
      await fetch("/api/beyond-presence/process-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId, 
          transcript,
          participantEmail 
        }),
      });
    } catch (error) {
      console.error("Failed to process speech:", error);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (audioRef.current) {
      audioRef.current.muted = !audioEnabled;
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar Display */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-semibold flex items-center">
            <Bot className="w-5 h-5 mr-2" />
            AI Interviewer
          </h3>
          <div className="flex items-center space-x-2">
            {isListening && (
              <div className="flex items-center text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                Listening...
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
                Speaking...
              </div>
            )}
          </div>
        </div>

        {/* Avatar Video */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="AI Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Bot className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400">Initializing AI Avatar...</p>
              </div>
            </div>
          )}
        </div>

        {/* Audio Controls */}
        <div className="flex justify-center mt-4 space-x-4">
          <button
            onClick={audioEnabled ? toggleAudio : toggleAudio}
            className={`p-3 rounded-full transition-colors ${
              audioEnabled ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            {audioEnabled ? (
              <Volume2 className="w-6 h-6 text-white" />
            ) : (
              <VolumeX className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <MessageSquare className="w-4 h-4 mr-2" />
          Conversation
        </h4>
        
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Start speaking to begin the conversation...
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} autoPlay />
    </div>
  );
}
