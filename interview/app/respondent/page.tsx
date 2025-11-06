"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { AlertCircle } from "lucide-react";
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
  const persistedEmailRef = useRef<string | null>(null);

  const rawEmailParam =
    searchParams?.get('participantEmail') ||
    searchParams?.get('email') ||
    searchParams?.get('userEmail') ||
    null;

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

  const trimmedEmailParam = rawEmailParam ? rawEmailParam.trim() : null;
  const sessionEmail = session?.participantEmail ? String(session.participantEmail) : null;
  const effectiveEmail = trimmedEmailParam || sessionEmail || null;
  const normalizedEffectiveEmail = effectiveEmail ? effectiveEmail.toLowerCase() : null;

  // Auto-start: once session is loaded, immediately connect to BEY
  useEffect(() => {
    if (session && !isConnected) {
      setIsConnected(true);
    }
  }, [session, isConnected]);

  useEffect(() => {
    if (!sessionId || !normalizedEffectiveEmail) {
      return;
    }
    if ((session?.participantEmail || '').toLowerCase() === normalizedEffectiveEmail) {
      persistedEmailRef.current = normalizedEffectiveEmail;
      return;
    }
    if (persistedEmailRef.current === normalizedEffectiveEmail) {
      return;
    }

    const persist = async () => {
      try {
        const response = await fetch('/api/sessions/update-transcript', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            transcript: [],
            participantEmail: normalizedEffectiveEmail,
          }),
        });
        if (response.ok) {
          persistedEmailRef.current = normalizedEffectiveEmail;
        } else {
          console.warn('Failed to persist participant email', await response.text());
        }
      } catch (err) {
        console.error('Error persisting participant email:', err);
      }
    };

    void persist();
  }, [sessionId, normalizedEffectiveEmail, session?.participantEmail]);

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

  // Email is optional - allow interview to proceed without it
  // The email will be captured later if needed

  if (isConnected) {
    return (
      <SimpleBPInterviewRoom
        sessionId={sessionId}
        participantEmail={effectiveEmail || undefined}
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
