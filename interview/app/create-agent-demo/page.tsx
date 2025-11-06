"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import SimpleBPInterviewRoom from "../components/SimpleBPInterviewRoom";

type DemoSession = {
  sessionId: string;
  researchGoal: string;
  script?: any;
};

const demoScript = {
  title: "Mobile App Feedback Interview",
  description:
    "Explore how participants use and feel about mobile productivity tools to uncover opportunities for delight.",
  opening: {
    greeting: "Hi there! Thanks for taking the time to chat with me today.",
    purpose:
      "I’m researching how people manage their day-to-day tasks on mobile devices. Your experiences will help shape what we build next.",
  },
  questions: [
    {
      id: "q1",
      text: "Walk me through how you used your phone to tackle your to-do list in the last day or so.",
      topic: "Current workflow",
    },
    {
      id: "q2",
      text: "What felt surprisingly smooth or annoyingly clunky in that experience?",
      topic: "Pain points",
    },
    {
      id: "q3",
      text: "If you could wave a magic wand and redesign one part of that flow, what would you change?",
      topic: "Opportunities",
    },
  ],
  followUps: {
    q1: ["Ask how often they repeat this flow", "Probe for any tools they combine together"],
    q2: ["Dig into a recent example", "Clarify severity and frequency"],
    q3: ["Ask how they solve it today", "Explore impact if solved"],
  },
  closing: {
    wrapUp: "Thanks for sharing all of that. I really appreciate the specifics.",
    finalQuestion: "Anything else about your mobile workflow that bugs you or makes you smile?",
  },
};

export default function CreateAgentDemoPage() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const researchGoal = useMemo(
    () => "Understand how people manage daily productivity on mobile devices",
    [],
  );

  useEffect(() => {
    let isActive = true;

    const bootstrapSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            researchGoal,
            adminEmail: "demo@ai-interview.local",
            targetAudience: "Productivity app users",
            duration: 25,
            sensitivity: "medium",
            script: demoScript,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to create demo session");
        }

        const payload = await response.json();
        if (!isActive) return;

        setSession({
          sessionId: payload.sessionId,
          researchGoal: payload.session?.researchGoal ?? researchGoal,
          script: payload.session?.script ?? demoScript,
        });
      } catch (err) {
        console.error("❌ Failed to create demo session:", err);
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Unexpected error creating demo session");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      isActive = false;
    };
  }, [researchGoal]);

  const handleDisconnect = () => {
    console.log("Disconnected from interview");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050013] text-zinc-100">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-cyan-300" />
        <p className="text-sm text-zinc-300">Bootstrapping demo session…</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050013] px-6 text-center text-zinc-100">
        <AlertCircle className="mb-4 h-12 w-12 text-amber-300" />
        <h1 className="text-2xl font-semibold">Demo session unavailable</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-300">{error ?? "We couldn’t prepare the demo session. Try again later."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050013]">
      <SimpleBPInterviewRoom
        sessionId={session.sessionId}
        participantEmail="demo@example.com"
        researchGoal={session.researchGoal}
        interviewScript={session.script}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}
