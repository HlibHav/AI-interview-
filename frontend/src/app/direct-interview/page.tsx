"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Bot, User, AlertCircle } from "lucide-react";
import AIInterviewRoom from "@/components/AIInterviewRoom";
import CameraPermissionPrompt from "@/components/CameraPermissionPrompt";

export default function DirectAIInterview() {
  const [isConnected, setIsConnected] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [researchGoal, setResearchGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Generate a unique session ID when component mounts
    const generatedSessionId = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(generatedSessionId);
    
    // Set a default research goal
    setResearchGoal("Understanding user needs and preferences for product development");
  }, []);

  const handlePermissionsGranted = () => {
    setHasPermissions(true);
    setShowEmailForm(false);
  };

  const handleEmailSubmit = (email: string) => {
    setParticipantEmail(email);
    setShowEmailForm(false);
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Start the interview session using the direct API
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

      const data = await response.json();
      setSessionId(data.sessionId); // Update with the generated session ID
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to start interview:", error);
      setError("Failed to start interview. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md mx-4">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-400 mr-2" />
            <h2 className="text-xl font-bold text-red-400">Error</h2>
          </div>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => setError("")}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!hasPermissions) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <CameraPermissionPrompt onPermissionsGranted={handlePermissionsGranted} />
      </div>
    );
  }

  if (showEmailForm) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-4">
          <div className="text-center mb-6">
            <Bot className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Start AI Interview</h2>
            <p className="text-gray-300">
              You'll be interviewed by an AI assistant to help us understand your needs and preferences.
            </p>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const email = formData.get("email") as string;
            const goal = formData.get("goal") as string;
            handleEmailSubmit(email);
            setResearchGoal(goal);
          }}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address (Optional)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-gray-400 mt-1">
                This helps us follow up with you if needed
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="goal" className="block text-sm font-medium text-gray-300 mb-2">
                Research Focus (Optional)
              </label>
              <textarea
                id="goal"
                name="goal"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What would you like to discuss? (e.g., product preferences, user experience, feature ideas)"
                defaultValue={researchGoal}
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Interview
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {isConnected ? (
        <AIInterviewRoom
          sessionId={sessionId}
          participantEmail={participantEmail}
          researchGoal={researchGoal}
          onDisconnect={handleDisconnect}
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          {/* Header */}
          <header className="w-full max-w-6xl mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bot className="w-8 h-8 text-blue-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-white">AI Research Interview</h1>
                    <p className="text-gray-300">
                      {researchGoal}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Session: {sessionId}</p>
                  <p className="text-sm text-gray-400">Participant: {participantEmail || "Anonymous"}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-8 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Start?</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  You'll be connected to an AI interviewer who will ask you questions about your experiences, 
                  preferences, and needs. This helps us understand how to improve our products and services.
                </p>
                <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-300 mb-2">What to expect:</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• The AI will introduce itself and explain the purpose</li>
                    <li>• Questions will be open-ended to understand your perspective</li>
                    <li>• Feel free to share your honest thoughts and experiences</li>
                    <li>• The session typically lasts 15-30 minutes</li>
                    <li>• You can end the interview at any time</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="mt-6 inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <Bot className="w-5 h-5 mr-2" />
                    Start AI Interview
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
