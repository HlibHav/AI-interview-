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
  const [enteredEmail, setEnteredEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

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
  const effectiveEmail = trimmedEmailParam || sessionEmail || submittedEmail || null;
  const normalizedEffectiveEmail = effectiveEmail ? effectiveEmail.toLowerCase() : null;

  // Auto-start: once session is loaded, immediately connect to BEY
  useEffect(() => {
    if (session && normalizedEffectiveEmail && !isConnected) {
      setIsConnected(true);
    }
  }, [session, normalizedEffectiveEmail, isConnected]);

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
        const response = await fetch('/api/sessions/participant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
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

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = enteredEmail.trim();
    if (!trimmed) {
      setEmailError('Email is required to begin the interview.');
      return;
    }
    const normalized = trimmed.toLowerCase();
    setSubmittedEmail(normalized);
    setEmailError(null);
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

  if (isConnected && normalizedEffectiveEmail) {
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

  if (!normalizedEffectiveEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">Before we begin</h1>
            <p className="text-sm text-gray-500">
              Please confirm your email so we can connect you to the right interview.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <div>
              <label htmlFor="participant-email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="participant-email"
                type="email"
                required
                value={enteredEmail}
                onChange={(event) => setEnteredEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            {emailError && (
              <p className="text-sm text-red-600">{emailError}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Continue
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center">
            Your email helps us personalize the conversation and keep your responses secure.
          </p>
        </div>
      </div>
    );
  }

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
