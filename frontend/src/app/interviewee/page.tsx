"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Settings, AlertCircle } from "lucide-react";
import LiveKitRoom from "@/components/LiveKitRoom";
import CameraPermissionPrompt from "@/components/CameraPermissionPrompt";

export default function IntervieweeInterface() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided. Please use a valid interview link.");
    }
  }, [sessionId]);

  const handlePermissionsGranted = () => {
    setHasPermissions(true);
    setShowEmailForm(false);
  };

  const handleEmailSubmit = (email: string) => {
    setParticipantEmail(email);
    setShowEmailForm(false);
  };

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Session</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  if (showEmailForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <Mic className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Interview Session</h1>
            <p className="text-gray-600">
              Session ID: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{sessionId}</span>
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const email = formData.get("email") as string;
            handleEmailSubmit(email);
          }} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address (Optional)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue to Interview
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!hasPermissions) {
    return (
      <CameraPermissionPrompt onPermissionsGranted={handlePermissionsGranted} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">AI Interview Session</h1>
            <p className="text-sm text-gray-300">
              Session: {sessionId} • Participant: {participantEmail || "Anonymous"}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Connected</span>
            </div>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {isConnected ? (
          <LiveKitRoom
            sessionId={sessionId!}
            participantEmail={participantEmail}
            isMuted={isMuted}
            isVideoEnabled={isVideoEnabled}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-800 rounded-lg p-8 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Start?</h2>
              <p className="text-gray-300 mb-6">
                You'll be connected to an AI interviewer. Make sure your camera and microphone are working properly.
              </p>
              <button
                onClick={handleConnect}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Phone className="w-5 h-5 mr-2" />
                Start Interview
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        {isConnected && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-800 rounded-full p-4 flex items-center space-x-4">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full transition-colors ${
                  isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </button>
              
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  !isVideoEnabled ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {isVideoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
              </button>
              
              <button
                onClick={handleDisconnect}
                className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
