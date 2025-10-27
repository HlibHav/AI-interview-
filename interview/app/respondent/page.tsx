"use client";

import { useState, useEffect, Suspense } from "react";
import { Mic, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import SimpleBPInterviewRoom from "../components/SimpleBPInterviewRoom";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

function RespondentInterfaceContent() {
  const searchParams = useSearchParams();
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [session, setSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract session ID from URL (support both sessionId and session parameters)
    const id = searchParams?.get('sessionId') || searchParams?.get('session');
    if (id) {
      setSessionId(id);
      loadSession(id);
    } else {
      setError("No session ID provided. Please use the link from your researcher.");
      setIsLoadingSession(false);
    }
  }, [searchParams]);

  const loadSession = async (id: string) => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
      } else {
        setError("Session not found. Please check your link and try again.");
      }
    } catch (err) {
      console.error("Error loading session:", err);
      setError("Failed to load session. Please try again later.");
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleStartInterview = () => {
    if (!participantEmail.trim()) {
      setError("Please enter your email address");
      return;
    }
    // Skip intermediate screens and go directly to BP agent
    setPermissionsGranted(true);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setPermissionsGranted(false);
    // Reset to email input screen for restart
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isConnected && permissionsGranted) {
    return (
      <SimpleBPInterviewRoom
        sessionId={sessionId}
        participantEmail={participantEmail}
        researchGoal={session?.researchGoal}
        interviewScript={session?.script}
        onDisconnect={handleDisconnect}
      />
    );
  }

  // Removed intermediate camera permission screen - going directly to BP agent

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <Mic className="h-8 w-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            AI Interview Session
          </h1>

          <p className="text-gray-600 mb-6">
            You've been invited to participate in a research interview.
            The AI interviewer will ask you questions about your experiences and opinions.
          </p>

          {session?.researchGoal && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Research Topic:</h3>
              <p className="text-sm text-blue-800">{session.researchGoal}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                Email Address
              </label>
              <input
                type="email"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                placeholder="your.email@example.com"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <h3 className="font-semibold mb-2">What to expect:</h3>
              <ul className="space-y-1 text-left">
                <li>• 15-30 minute conversation</li>
                <li>• Questions about your experiences</li>
                <li>• You can pause or stop anytime</li>
                <li>• Your responses are anonymized</li>
                <li>• Camera and microphone required</li>
              </ul>
            </div>

            <button
              onClick={handleStartInterview}
              className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RespondentInterface() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RespondentInterfaceContent />
    </Suspense>
  );
}
