"use client";

import { useState, useEffect, Suspense } from "react";
import { Mic, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import SimpleBPInterviewRoom from "../components/SimpleBPInterviewRoom";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

function RespondentInterfaceContent() {
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState("");
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

  // Auto-start: once session is loaded, immediately connect to BEY
  useEffect(() => {
    if (session && !isConnected) {
      setIsConnected(true);
    }
  }, [session, isConnected]);

  const handleDisconnect = () => {
    setIsConnected(false);
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

  if (isConnected) {
    return (
      <SimpleBPInterviewRoom
        sessionId={sessionId}
        participantEmail={`anonymous-${sessionId.slice(0, 8)}@interview.local`}
        researchGoal={session?.researchGoal}
        interviewScript={session?.script}
        onDisconnect={handleDisconnect}
      />
    );
  }

  // Auto-start mode: show a minimal starting screen before connection
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-700">Starting your interview...</p>
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
