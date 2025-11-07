"use client";

import { useSearchParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Users, FileText, BarChart3, Settings, Sparkles } from "lucide-react";
import { SessionCard } from "./components/SessionCard";
import SpotlightCard from "../components/ui/spotlight-card";
import ShinyText from "../components/ui/shiny-text";
import BatchSummaryPanel from "./batch-summary/BatchSummaryPanel";

const researchGoalSchema = z.object({
  goal: z.string().min(10, "Please provide a more detailed research goal"),
  targetAudience: z.string().optional(),
  duration: z.string().optional(),
  sensitivity: z.enum(["low", "medium", "high"]).optional(),
});

type ResearchGoalForm = z.infer<typeof researchGoalSchema>;

interface ClarificationMessage {
  id: string;
  type: "agent" | "user";
  content: string;
  timestamp: Date;
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize step from URL on mount, or default to "goal"
  const getInitialStep = (): "goal" | "clarification" | "script" | "sessions" | "batch-summary" => {
    const stepParam = searchParams?.get('step');
    if (stepParam === 'sessions') return 'sessions';
    if (stepParam === 'batch-summary') return 'batch-summary';
    if (stepParam === 'goal') return 'goal';
    if (stepParam === 'clarification') return 'clarification';
    if (stepParam === 'script') return 'script';
    return 'goal';
  };
  
  const [currentStep, setCurrentStep] = useState<"goal" | "clarification" | "script" | "sessions" | "batch-summary">(getInitialStep());
  const [clarificationMessages, setClarificationMessages] = useState<ClarificationMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clarificationHistory, setClarificationHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [researchGoalData, setResearchGoalData] = useState<ResearchGoalForm | null>(null);
  const [interviewScript, setInterviewScript] = useState<any>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionsData, setSessionsData] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);
  const [sessionFilter, setSessionFilter] = useState<'completed'>('completed');
  const [sessionQuery, setSessionQuery] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const clarificationInputRef = React.useRef<HTMLInputElement | null>(null);
  const isInternalNavigation = React.useRef(false);

  // Handle URL params for navigation (only on URL changes, not state changes)
  useEffect(() => {
    // If this was an internal navigation (button click), skip syncing URL -> state
    if (isInternalNavigation.current) {
      isInternalNavigation.current = false;
      return;
    }

    const stepParam = searchParams?.get('step');
    const sessionParam = searchParams?.get('session');

    // Determine what step the URL wants
    let urlStep: "goal" | "clarification" | "script" | "sessions" | "batch-summary" | null = null;
    if (stepParam === 'sessions') {
      urlStep = 'sessions';
    } else if (stepParam === 'batch-summary') {
      urlStep = 'batch-summary';
    } else if (stepParam === 'goal') {
      urlStep = 'goal';
    } else if (stepParam === 'clarification') {
      urlStep = 'clarification';
    } else if (stepParam === 'script') {
      urlStep = 'script';
    } else if (!stepParam) {
      // No step param means default to 'goal'
      urlStep = 'goal';
    }

    // Only update if URL step differs from current state
    if (urlStep && urlStep !== currentStep) {
      setCurrentStep(urlStep);
    }

    // Handle session expansion for URL navigation
    if (sessionParam && urlStep === 'sessions') {
      setExpandedSessionId(sessionParam);
      // Scroll to session after a brief delay to allow rendering
      setTimeout(() => {
        const element = document.querySelector(`[data-session-id="${sessionParam}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [searchParams]); // Only react to URL changes, NOT state changes


  const form = useForm<ResearchGoalForm>({
    resolver: zodResolver(researchGoalSchema),
    defaultValues: {
      goal: "",
      targetAudience: "",
      duration: "15",
      sensitivity: "low",
    },
  });

  const loadSessions = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoadingSessions(true);
      setSessionsError(null);
    }

    try {
      const response = await fetch('/api/sessions', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to load sessions (status ${response.status})`);
      }

      const data = await response.json();
      setSessionsData(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (loadError: any) {
      console.error('Error loading sessions:', loadError);
      if (!silent) {
        setSessionsError(loadError?.message || 'Failed to load sessions.');
      }
    } finally {
      if (!silent) {
        setIsLoadingSessions(false);
      }
    }
  }, []);

  useEffect(() => {
    loadSessions().catch(() => null);
  }, [loadSessions]);

  useEffect(() => {
    if (currentStep === "sessions") {
      loadSessions().catch(() => null);
    }
  }, [currentStep, loadSessions]);

  // Poll for sessions that are in analysis
  useEffect(() => {
    if (currentStep !== "sessions") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const hasAnalyzingSessions = sessionsData.some(session => {
      const status = session.status || 'created';
      if (status !== 'completed') return false;
      
      const summaryRecord = session.summaries?.[0] || 
        (session.summary ? { summary: session.summary, keyInsights: session.keyFindings } : null);
      const hasSummary = summaryRecord && summaryRecord.summary && summaryRecord.summary !== 'Summary not yet generated.';
      const hasPsychometricProfile = session.psychometricProfile && session.psychometricProfile.traits;
      
      return !hasSummary || !hasPsychometricProfile;
    });

    if (hasAnalyzingSessions && !pollingRef.current) {
      console.log('🔄 Starting polling for analyzing sessions...');
      pollingRef.current = setInterval(() => {
        loadSessions({ silent: true }).catch(() => null);
      }, 5000); // Poll every 5 seconds
    } else if (!hasAnalyzingSessions && pollingRef.current) {
      console.log('✅ Stopping polling - all sessions analyzed');
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [sessionsData, currentStep, loadSessions]);


  const completedStatuses = useMemo(
    () => new Set(['completed', 'complete', 'finished', 'analyzed', 'analysed']),
    []
  );


  const filteredSessions = useMemo(() => {
    const query = sessionQuery.trim().toLowerCase();
    return sessionsData
      .slice()
      .filter((session) => !!session)
      .filter((session) => {
        const statusRaw = (session.status || 'created').toString().toLowerCase();
        if (!completedStatuses.has(statusRaw)) {
          return false;
        }
        if (sessionFilter === 'completed') {
          return completedStatuses.has(statusRaw);
        }
        return true;
      })
      .filter((session) => {
        if (!query) return true;
        return (
          (session.researchGoal || '').toLowerCase().includes(query) ||
          (session.sessionId || '').toLowerCase().includes(query) ||
          (session.participantEmail || '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
  }, [sessionsData, sessionFilter, sessionQuery, completedStatuses]);

  const groupedSessions = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        title: string;
        subtitle?: string;
        sortWeight: number;
        sessions: any[];
      }
    >();

    filteredSessions.forEach((session) => {
      const key = 'ungrouped';
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          title: 'Individual Sessions',
          subtitle: undefined,
          sortWeight: 1,
          sessions: [],
        };
        groups.set(key, group);
      }
      group.sessions.push(session);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.sortWeight !== b.sortWeight) {
        return a.sortWeight - b.sortWeight;
      }
      return a.title.localeCompare(b.title);
    });
  }, [filteredSessions]);

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const renderSessionCard = (session: any) => (
    <SessionCard
      key={session?.sessionId || session?.id}
      session={session}
      expanded={expandedSessionId === (session?.sessionId || session?.id)}
      onToggle={() =>
        setExpandedSessionId((prev) =>
          prev === (session?.sessionId || session?.id) ? null : (session?.sessionId || session?.id)
        )
      }
      formatDateTime={formatDateTime}
    />
  );

  const handleSubmitGoal = async (data: ResearchGoalForm) => {
    setIsGenerating(true);
    setError(null);
    setResearchGoalData(data);
    
    try {
      const response = await fetch('/api/agents/clarification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          researchGoal: data.goal,
          clarifications: []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get clarification questions');
      }

      const result = await response.json();
      
      if (result.status === "complete") {
        // If no clarification needed, move directly to script generation
        setCurrentStep("script");
        await generateInterviewScript(result.brief || "Research goal ready for interview script generation.");
      } else if (result.status === "questions" && result.questions) {
        // Display AI-generated questions
        const messages: ClarificationMessage[] = [
          {
            id: "intro",
            type: "agent",
            content: "Thank you for your research goal. To help me create the best interview plan, I have a few questions:",
            timestamp: new Date(),
          }
        ];

        // Add each question as a separate message
        result.questions.forEach((question: string, index: number) => {
          messages.push({
            id: `question-${index}`,
            type: "agent",
            content: question,
            timestamp: new Date(),
          });
        });

        setClarificationMessages(messages);
        setCurrentStep("clarification");
      }
    } catch (error) {
      console.error('Error getting clarification questions:', error);
      setError('Failed to generate clarification questions. Please try again.');
      
      // Fallback to basic questions if API fails
      setClarificationMessages([
        {
          id: "fallback-1",
          type: "agent",
          content: "I'm having trouble connecting to the AI service. Let me ask you a few basic questions:",
          timestamp: new Date(),
        },
        {
          id: "fallback-2",
          type: "agent",
          content: "What specific behaviors or experiences are you most interested in learning about?",
          timestamp: new Date(),
        },
        {
          id: "fallback-3",
          type: "agent",
          content: "Are there any sensitive topics we should approach carefully?",
          timestamp: new Date(),
        },
      ]);
      setCurrentStep("clarification");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateInterviewScript = async (brief: string) => {
    setIsGeneratingScript(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agents/planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          researchGoal: researchGoalData?.goal || '',
          clarifications: clarificationHistory,
          brief: brief
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate interview script');
      }

      const result = await response.json();
      
      if (result.success && result.script) {
        setInterviewScript(result.script);
      } else {
        throw new Error('Invalid script response');
      }
    } catch (error) {
      console.error('Error generating interview script:', error);
      setError('Failed to generate interview script. Please try again.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleApproveScript = async () => {
    setIsCreatingSession(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: interviewScript,
          researchGoal: researchGoalData?.goal || '',
          adminEmail: 'admin@example.com', // This should come from auth
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const result = await response.json();
      
      if (result.success && result.sessionUrl) {
        setSessionUrl(result.sessionUrl);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please try again.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const sendClarificationResponse = async (message: string) => {
    if (!message.trim()) return;
    
    const userMessage: ClarificationMessage = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    
    setClarificationMessages(prev => [...prev, userMessage]);
    setClarificationHistory(prev => [...prev, message]);
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agents/clarification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          researchGoal: researchGoalData?.goal || '',
          clarifications: [...clarificationHistory, message]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process clarification response');
      }

      const result = await response.json();
      
      if (result.status === "complete") {
        // Clarification is complete, show completion message and generate script
        const completionMessage: ClarificationMessage = {
          id: (Date.now() + 1).toString(),
          type: "agent",
          content: "Thank you for those clarifications! I now have enough information to generate your interview script. Let me create a comprehensive plan for you.",
          timestamp: new Date(),
        };
        setClarificationMessages(prev => [...prev, completionMessage]);
        
        // Generate interview script and move to script step
        setTimeout(async () => {
          setCurrentStep("script");
          await generateInterviewScript(result.brief || "Research goal clarified and ready for interview script generation.");
        }, 1500);
      } else if (result.status === "questions" && result.questions) {
        // More questions needed
        const followUpMessages: ClarificationMessage[] = result.questions.map((question: string, index: number) => ({
          id: `followup-${Date.now()}-${index}`,
          type: "agent" as const,
          content: question,
          timestamp: new Date(),
        }));
        
        setClarificationMessages(prev => [...prev, ...followUpMessages]);
      }
    } catch (error) {
      console.error('Error processing clarification response:', error);
      setError('Failed to process your response. Please try again.');
      
      // Fallback response
      const fallbackMessage: ClarificationMessage = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: "I'm having trouble processing your response. Let me proceed with the information I have and generate your interview script.",
        timestamp: new Date(),
      };
      setClarificationMessages(prev => [...prev, fallbackMessage]);
      
      // Move to script generation after error
      setTimeout(() => {
        setCurrentStep("script");
      }, 2000);
    } finally {
      setIsGenerating(false);
    }
  };

  const primaryActionClasses =
    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300 px-5 py-2 text-sm font-semibold text-[#050013] shadow-lg shadow-cyan-900/40 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/60 disabled:from-zinc-600 disabled:via-zinc-500 disabled:to-zinc-600 disabled:text-zinc-200 disabled:opacity-80 disabled:cursor-not-allowed";
  const secondaryActionClasses =
    "inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-transparent px-5 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-cyan-400/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-60 disabled:cursor-not-allowed";
  const inputClasses =
    "w-full rounded-xl border border-zinc-700/60 bg-white/5 px-3 py-2 text-base text-white placeholder:text-zinc-300 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 backdrop-blur-sm";
  const labelClasses = "block text-sm font-medium text-zinc-300 mb-2";

  const navigationItems = [
    { id: "goal", label: "Research Goal", icon: FileText },
    { id: "clarification", label: "Clarification", icon: Users },
    { id: "script", label: "Interview Script", icon: FileText },
    { id: "batch-summary", label: "Batch Summary", icon: BarChart3 },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050013] text-zinc-100 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-80 before:bg-[radial-gradient(circle_at_top,_rgba(76,29,149,0.45),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.35),_transparent_60%)] before:content-[''] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:backdrop-blur-[120px] after:content-['']">
      <header className="border-b border-zinc-800/60 bg-white/5 backdrop-blur">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <ShinyText text="Research Control Center" speed={4} className="text-sm" />
            </div>
            <h1 className="mt-4 bg-gradient-to-r from-white via-cyan-100 to-emerald-100 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-400 sm:text-base">
              Plan interviews, manage clarifications, launch sessions, and monitor insights in one flow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className={secondaryActionClasses}>
              <Settings className="h-4 w-4" />
              Workspace Settings
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-0 max-w-[1400px] mx-auto px-6 py-10 lg:px-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          {/* Sidebar Navigation */}
          <aside className="w-full flex-shrink-0 lg:w-72 xl:w-80">
            <SpotlightCard className="border border-zinc-700/40 bg-white/8 p-6 lg:p-7 shadow-lg shadow-cyan-900/20" spotlightColor="rgba(255, 255, 255, 0.18)">
              <nav className="space-y-3">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentStep === item.id;
                  const sharedClasses =
                    "group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200";

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        // Mark as internal navigation to prevent effect from overriding
                        isInternalNavigation.current = true;
                        // Update state
                        setCurrentStep(item.id as any);
                        // Update URL to keep them in sync (clear step param for internal navigation)
                        const params = new URLSearchParams(searchParams?.toString() || '');
                        if (item.id === 'goal') {
                          // For goal, clear step param to use default
                          params.delete('step');
                        } else {
                          params.set('step', item.id);
                        }
                        // Keep other params like goal and session
                        router.replace(`/admin?${params.toString()}`, { scroll: false });
                      }}
                      className={`${sharedClasses} ${
                        isActive
                          ? "border-cyan-400/60 bg-cyan-500/10 text-white shadow-lg shadow-cyan-900/30"
                          : "border-transparent text-zinc-300 hover:border-cyan-400/40 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          className={`h-5 w-5 transition-colors ${
                            isActive ? "text-cyan-200" : "text-cyan-200/60 group-hover:text-cyan-100"
                          }`}
                        />
                        {item.label}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive ? "bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.65)]" : "bg-zinc-600"
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>
            </SpotlightCard>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-10">
            {currentStep === "goal" && (
              <div className="rounded-2xl border border-zinc-700/40 bg-white/8 p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-white">Define Research Goal</h2>
                  <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                    Capture the mission for this study. We’ll use it to guide clarifications, generate scripts, and
                    ensure every interview stays on target.
                  </p>
                </div>
                <form onSubmit={form.handleSubmit(handleSubmitGoal)} className="space-y-6">
                  <div>
                    <label className={labelClasses}>
                      Research Goal *
                    </label>
                    <textarea
                      {...form.register("goal")}
                      rows={4}
                      className={`${inputClasses} h-32 resize-none`}
                      placeholder="e.g., Understand how busy parents organize their evening routines and where friction appears."
                    />
                    {form.formState.errors.goal && (
                      <p className="mt-2 text-sm text-red-400">{form.formState.errors.goal.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClasses}>
                        Target Audience
                      </label>
                      <input
                        {...form.register("targetAudience")}
                        type="text"
                        className={inputClasses}
                        placeholder="e.g., Young professionals, Parents, Students"
                      />
                    </div>

                    <div>
                      <label className={labelClasses}>
                        Duration (minutes)
                      </label>
                      <select
                        {...form.register("duration")}
                        className={`${inputClasses} pr-8`}
                      >
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="20">20 minutes</option>
                        <option value="30">30 minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClasses}>
                        Sensitivity Level
                      </label>
                      <select
                        {...form.register("sensitivity")}
                        className={`${inputClasses} pr-8`}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className={primaryActionClasses}
                    >
                      {isGenerating ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-[#050013]" />
                          Generating...
                        </>
                      ) : (
                        <>
                          Start Clarification
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        form.reset();
                        setClarificationMessages([]);
                        setCurrentStep("clarification");
                      }}
                      className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
                    >
                      Skip clarification workflow
                    </button>
                  </div>
                </form>
              </div>
            )}

            {currentStep === "clarification" && (
              <div className="rounded-2xl border border-zinc-700/40 bg-white/8 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-white">Clarification Chat</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Answer a few quick questions so the planning agent can tailor the interview flow.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="mb-6 max-h-96 space-y-4 overflow-y-auto pr-2">
                  {clarificationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-lg rounded-2xl border px-4 py-3 text-sm leading-relaxed backdrop-blur ${
                          message.type === "user"
                            ? "border-cyan-400/50 bg-gradient-to-r from-cyan-500/30 via-emerald-500/20 to-cyan-400/30 text-white shadow-lg shadow-cyan-900/30"
                            : "border-zinc-700/60 bg-white/5 text-zinc-200"
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="mt-2 text-xs text-zinc-400/80">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {isGenerating && (
                  <div className="mb-4 flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-cyan-200" />
                      AI is thinking...
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Type your response..."
                    disabled={isGenerating}
                    ref={clarificationInputRef}
                    className={`${inputClasses} flex-1 disabled:cursor-not-allowed disabled:opacity-60`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !isGenerating) {
                        const value = event.currentTarget.value.trim();
                        if (value) {
                          event.preventDefault();
                          sendClarificationResponse(value);
                          event.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const value = clarificationInputRef.current?.value?.trim();
                      if (value) {
                        sendClarificationResponse(value);
                        clarificationInputRef.current!.value = "";
                      }
                    }}
                    disabled={isGenerating}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-500/20 text-cyan-100 transition-all hover:bg-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === "script" && (
              <div className="rounded-2xl border border-zinc-700/40 bg-white/8 p-8">
                <div className="mb-6 flex flex-col gap-2">
                  <h2 className="text-2xl font-semibold text-white">Interview Script</h2>
                  <p className="text-sm text-zinc-400">
                    Review and approve the AI-generated plan. You can regenerate it or share the participant link once it feels right.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {isGeneratingScript && (
                  <div className="flex items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 py-12 text-sm text-cyan-100">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-cyan-200" />
                      Generating your personalized interview script...
                    </div>
                  </div>
                )}

                {interviewScript && !isGeneratingScript && (
                  <div className="space-y-8">
                    <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-6 text-sm text-cyan-100 shadow-lg shadow-cyan-900/20">
                      <h3 className="text-lg font-semibold text-white">Introduction</h3>
                      <p className="mt-3 text-sm leading-relaxed text-cyan-50/90">
                        {interviewScript.introduction}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Main Questions</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {interviewScript.questions?.map((question: any, index: number) => {
                          const followUps: string[] =
                            (interviewScript.followUps && interviewScript.followUps[question.id]) || [];
                          return (
                            <div
                              key={question.id || index}
                              className="rounded-2xl border border-zinc-700/60 bg-white/5 p-5 text-sm text-zinc-200 backdrop-blur"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                                  {question.topic || `Question ${index + 1}`}
                                </span>
                              </div>
                              <p className="mt-3 text-base font-medium text-white">“{question.text}”</p>
                              {followUps.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                                    Follow-ups
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {followUps.map((follow: string, followIdx: number) => (
                                      <span
                                        key={`${question.id || index}-follow-${followIdx}`}
                                        className="rounded-full border border-zinc-700/60 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300"
                                      >
                                        {follow}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {!interviewScript && !isGeneratingScript && (
                  <div className="rounded-2xl border border-zinc-700/60 bg-white/5 py-12 text-center text-sm text-zinc-300">
                    Complete the clarification process to generate your interview script.
                  </div>
                )}

                {interviewScript && !isGeneratingScript && (
                  <>
                    {sessionUrl && (
                      <div className="mb-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6 text-emerald-100 shadow-lg shadow-emerald-900/20">
                        <h3 className="text-lg font-semibold text-white mb-3">Interview Link Generated!</h3>
                        <p className="text-sm text-emerald-50/80 mb-4">
                          Share this link with participants to start interviews:
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={sessionUrl}
                            readOnly
                            className="flex-1 rounded-xl border border-emerald-400/50 bg-[#0b1a22]/60 px-4 py-2 text-sm font-mono text-emerald-100 shadow-inner shadow-emerald-900/40"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(sessionUrl);
                              alert('Link copied to clipboard!');
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/30"
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        onClick={() => {
                          setInterviewScript(null);
                          setSessionUrl(null);
                          generateInterviewScript("Regenerate interview script with current clarifications.");
                        }}
                        disabled={isGeneratingScript || isCreatingSession}
                        className={secondaryActionClasses}
                      >
                        Regenerate Script
                      </button>
                      {!sessionUrl && (
                        <button
                          onClick={handleApproveScript}
                          disabled={isCreatingSession}
                          className={primaryActionClasses}
                        >
                          {isCreatingSession ? 'Creating...' : 'Approve & Generate Link'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === "sessions" && (
              <div className="rounded-2xl border border-zinc-700/40 bg-white/8 p-8">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Interview Sessions</h2>
                    <p className="text-sm text-zinc-400">
                      Review completed interviews, summaries, and psychometric insights.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="flex overflow-hidden rounded-2xl border border-zinc-700/60 bg-white/5">
                      {([{ id: 'completed', label: 'Completed' }] as const).map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSessionFilter(tab.id)}
                          className={`px-4 py-2 text-sm font-medium transition-all ${
                            sessionFilter === tab.id
                              ? 'bg-cyan-500/20 text-white shadow-[inset_0_0_15px_rgba(34,211,238,0.25)]'
                              : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={sessionQuery}
                        onChange={(e) => setSessionQuery(e.target.value)}
                        placeholder="Search by goal, session, or email…"
                        className={`${inputClasses} w-full md:w-64`}
                      />
                      <button
                        onClick={() => loadSessions().catch(() => null)}
                        disabled={isLoadingSessions}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700/60 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-cyan-400/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoadingSessions ? 'Refreshing…' : 'Refresh'}
                      </button>
                    </div>
                  </div>
                </div>

                {sessionsError && (
                  <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {sessionsError}
                  </div>
                )}


                {isLoadingSessions ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-700/60 bg-white/5 py-16 text-sm text-zinc-300">
                    <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/40 border-t-cyan-300" />
                    Loading sessions…
                  </div>
                ) : sessionsData.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-700/60 bg-white/5 py-12 text-center text-zinc-400">
                    <Users className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
                    No sessions recorded yet. Approve a script to start collecting responses.
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-700/60 bg-white/5 py-12 text-center text-zinc-400">
                    No completed sessions match the current filters.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {groupedSessions.map((group) => {
                      const groupUpdatedAt =
                        group.sessions[0]?.updatedAt ||
                        group.sessions[0]?.createdAt;
                      const updatedAtLabel = groupUpdatedAt ? formatDateTime(groupUpdatedAt) : undefined;

                      return (
                        <section key={group.key} className="space-y-4">
                          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-white">
                                {group.title}
                              </h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                              <span className="rounded-full border border-zinc-700/60 bg-white/5 px-3 py-1 font-medium text-zinc-200">
                                {group.sessions.length} {group.sessions.length === 1 ? "session" : "sessions"}
                              </span>
                              {updatedAtLabel && (
                                <span className="rounded-full border border-zinc-700/60 bg-white/5 px-3 py-1 font-medium text-zinc-200">
                                  Updated {updatedAtLabel}
                                </span>
                              )}
                            </div>
                          </header>
                          <div className="space-y-4">
                            {group.sessions.map((session) => renderSessionCard(session))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentStep === "batch-summary" && (
              <div className="rounded-2xl border border-zinc-700/40 bg-white/8 p-8">
                <BatchSummaryPanel
                  embedded={true}
                  focusSessionId={searchParams?.get('session') || null}
                  focusGoalId={searchParams?.get('goal') || null}
                />
              </div>
            )}
            
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen overflow-hidden bg-[#050013] text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/40 border-t-cyan-300 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
