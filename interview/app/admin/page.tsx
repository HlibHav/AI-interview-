"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Users, FileText, BarChart3, Settings } from "lucide-react";
import AnalysisProgressBar from "../components/AnalysisProgressBar";

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

export default function AdminDashboard() {
  const [currentStep, setCurrentStep] = useState<"goal" | "clarification" | "script" | "sessions" | "analytics">("goal");
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

  const navigationItems = [
    { id: "goal", label: "Research Goal", icon: FileText },
    { id: "clarification", label: "Clarification", icon: Users },
    { id: "script", label: "Interview Script", icon: FileText },
    { id: "sessions", label: "Sessions", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">AI Interview Assistant</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.id}>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {item.label}
                      </a>
                    ) : (
                      <button
                        onClick={() => setCurrentStep(item.id as any)}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                          currentStep === item.id
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {item.label}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {currentStep === "goal" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Define Research Goal</h2>
                <form onSubmit={form.handleSubmit(handleSubmitGoal)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Research Goal *
                    </label>
                    <textarea
                      {...form.register("goal")}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Discover how users approach personal finance management and what challenges they face..."
                    />
                    {form.formState.errors.goal && (
                      <p className="text-red-600 text-sm mt-1">{form.formState.errors.goal.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Audience
                      </label>
                      <input
                        {...form.register("targetAudience")}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Young professionals, Parents, Students"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (minutes)
                      </label>
                      <select
                        {...form.register("duration")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="20">20 minutes</option>
                        <option value="30">30 minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sensitivity Level
                      </label>
                      <select
                        {...form.register("sensitivity")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Start Clarification
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {currentStep === "clarification" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Clarification Chat</h2>
                
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {clarificationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.type === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {isGenerating && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <p className="text-sm">AI is thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type your response..."
                    disabled={isGenerating}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-500"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !isGenerating) {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          sendClarificationResponse(input.value);
                          input.value = "";
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Type your response..."]') as HTMLInputElement;
                      if (input.value.trim()) {
                        sendClarificationResponse(input.value);
                        input.value = "";
                      }
                    }}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === "script" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Interview Script</h2>
                
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                
                {isGeneratingScript && (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <p className="text-gray-600">Generating your personalized interview script...</p>
                    </div>
                  </div>
                )}
                
                {interviewScript && !isGeneratingScript && (
                  <div className="prose max-w-none">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">Introduction</h3>
                      <p className="text-blue-800">
                        {interviewScript.introduction}
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Main Questions</h3>
                        <div className="space-y-4">
                          {interviewScript.questions?.map((question: any, index: number) => (
                            <div key={question.id || index} className="border border-gray-200 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-2">
                                {index + 1}. {question.topic || `Question ${index + 1}`}
                              </h4>
                              <p className="text-gray-700">"{question.text}"</p>
                              {interviewScript.followUps && interviewScript.followUps[question.id] && (
                                <div className="mt-2 text-sm text-gray-600">
                                  <strong>Follow-ups:</strong> {interviewScript.followUps[question.id].join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!interviewScript && !isGeneratingScript && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Complete the clarification process to generate your interview script.</p>
                  </div>
                )}

                {interviewScript && !isGeneratingScript && (
                  <>
                    {sessionUrl && (
                      <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-900 mb-3">Interview Link Generated!</h3>
                        <p className="text-sm text-green-800 mb-3">
                          Share this link with participants to start interviews:
                        </p>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={sessionUrl}
                            readOnly
                            className="flex-1 px-4 py-2 bg-white border border-green-300 rounded-md text-sm font-mono"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(sessionUrl);
                              alert('Link copied to clipboard!');
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end space-x-4 mt-8">
                      <button 
                        onClick={() => {
                          setInterviewScript(null);
                          setSessionUrl(null);
                          generateInterviewScript("Regenerate interview script with current clarifications.");
                        }}
                        disabled={isGeneratingScript || isCreatingSession}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Regenerate Script
                      </button>
                      {!sessionUrl && (
                        <button 
                          onClick={handleApproveScript}
                          disabled={isCreatingSession}
                          className="px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Interview Sessions</h2>
                    <p className="text-sm text-gray-500">
                      Review completed interviews, their summaries, and psychometric insights.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      Showing {sessionsData.length} session{sessionsData.length === 1 ? '' : 's'}
                    </span>
                    <button
                      onClick={() => loadSessions().catch(() => null)}
                      disabled={isLoadingSessions}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingSessions ? 'Refreshing…' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {sessionsError && (
                  <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {sessionsError}
                  </div>
                )}

                {isLoadingSessions ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <div className="h-10 w-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                    Loading sessions…
                  </div>
                ) : sessionsData.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No sessions recorded yet. Approve a script to start collecting responses.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sessionsData
                      .slice()
                      .filter((session) => !!session)
                      .sort(
                        (a, b) =>
                          new Date(b.updatedAt || b.createdAt || 0).getTime() -
                          new Date(a.updatedAt || a.createdAt || 0).getTime()
                      )
                      .map((session) => {
                        const status = session.status || 'created';
                        const statusClasses =
                          status === 'completed'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200';

                        const transcriptEntries = Array.isArray(session.transcript)
                          ? session.transcript
                          : [];
                        const transcriptCount = transcriptEntries.length;

                        const summaryRecord =
                          session.summaries?.[0] ||
                          (session.summary
                            ? { summary: session.summary, keyInsights: session.keyFindings }
                            : null);

                        const summaryText = summaryRecord?.summary || 'Summary not yet generated.';
                        const keyInsights: string[] = Array.isArray(summaryRecord?.keyInsights)
                          ? summaryRecord.keyInsights
                          : Array.isArray(session.keyFindings)
                            ? session.keyFindings
                            : [];

                        const keyThemes: string[] = Array.isArray(summaryRecord?.keyThemes)
                          ? summaryRecord.keyThemes
                          : [];

                        const profile = session.psychometricProfile || null;
                        const traitEntries = profile?.traits
                          ? Object.entries(profile.traits)
                          : [];

                        // Determine if analysis is complete
                        const hasSummary = summaryRecord && summaryRecord.summary && summaryRecord.summary !== 'Summary not yet generated.';
                        const hasPsychometricProfile = profile && traitEntries.length > 0;

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

                        return (
                          <div
                            key={session.sessionId}
                            className="border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow transition-shadow duration-150"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClasses}`}>
                                    {status.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    Updated {formatDateTime(session.updatedAt)}
                                  </span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {session.researchGoal || 'Untitled research goal'}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                  Session ID: {session.sessionId}
                                </p>
                                {session.sessionUrl && (
                                  <a
                                    href={session.sessionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                                  >
                                    Open respondent link
                                  </a>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 items-start text-sm text-gray-600">
                                <p>
                                  <span className="font-medium text-gray-700">Target audience:</span>{' '}
                                  {session.targetAudience || '—'}
                                </p>
                                <p>
                                  <span className="font-medium text-gray-700">Duration:</span>{' '}
                                  {session.durationMinutes
                                    ? `${session.durationMinutes} min`
                                    : `${session.duration || 30} min planned`}
                                </p>
                                <p>
                                  <span className="font-medium text-gray-700">Transcript entries:</span>{' '}
                                  {transcriptCount}
                                </p>
                                <p>
                                  <span className="font-medium text-gray-700">Completed:</span>{' '}
                                  {formatDateTime(session.endTime)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6">
                              {/* Show progress bar if analysis is not complete, otherwise show results */}
                              {(!hasSummary || !hasPsychometricProfile) && status === 'completed' ? (
                                <AnalysisProgressBar
                                  sessionId={session.sessionId}
                                  sessionStatus={status}
                                  hasTranscript={transcriptCount > 0}
                                  hasSummary={hasSummary}
                                  hasPsychometricProfile={hasPsychometricProfile}
                                />
                              ) : (
                                <div className="grid gap-6 lg:grid-cols-2">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                      Summary
                                    </h4>
                                    <p className="text-gray-700 leading-relaxed">{summaryText}</p>

                                    {(keyThemes.length > 0 || keyInsights.length > 0) && (
                                      <div className="mt-4 space-y-3">
                                        {keyThemes.length > 0 && (
                                          <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                              Key Themes
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              {keyThemes.map((theme: string) => (
                                                <span
                                                  key={theme}
                                                  className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium"
                                                >
                                                  {theme}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {keyInsights.length > 0 && (
                                          <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                              Key Insights
                                            </p>
                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                              {keyInsights.map((insight: string, idx: number) => (
                                                <li key={`${session.sessionId}-insight-${idx}`}>{insight}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                      Psychometric Profile
                                    </h4>
                                    {profile && traitEntries.length > 0 ? (
                                      <div className="space-y-3">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          {traitEntries.map(([trait, info]: [string, any]) => {
                                            const rawScore = Number(info?.score ?? info ?? 0);
                                            const score = Number.isFinite(rawScore) ? rawScore : 0;
                                            const normalizedScore = Math.min(Math.max(score, 0), 100);
                                            const explanation = info?.explanation || '';
                                            return (
                                              <div
                                                key={`${session.sessionId}-${trait}`}
                                                className="border border-gray-200 rounded-md p-3"
                                              >
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-sm font-medium text-gray-700 capitalize">
                                                    {trait}
                                                  </span>
                                                  <span className="text-sm font-semibold text-gray-900">
                                                    {Number.isFinite(score) ? Math.round(score) : '—'}
                                                  </span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                  <div
                                                    className="h-full bg-blue-500 rounded-full transition-all"
                                                    style={{
                                                      width: `${normalizedScore}%`
                                                    }}
                                                  />
                                                </div>
                                                {explanation && (
                                                  <p className="mt-2 text-xs text-gray-500 leading-snug">
                                                    {explanation}
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                        {profile?.overallProfile && (
                                          <div className="border border-blue-100 bg-blue-50 text-blue-900 rounded-md p-3 text-sm">
                                            <p className="font-semibold text-blue-800 mb-1">
                                              Overall Profile
                                            </p>
                                            <p className="leading-relaxed">{profile.overallProfile}</p>
                                          </div>
                                        )}
                                        {profile?.keyInsights && Array.isArray(profile.keyInsights) && profile.keyInsights.length > 0 && (
                                          <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                              Personality Insights
                                            </p>
                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                              {profile.keyInsights.map((insight: string, idx: number) => (
                                                <li key={`${session.sessionId}-profile-insight-${idx}`}>
                                                  {insight}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="border border-dashed border-gray-200 rounded-md p-4 text-sm text-gray-500">
                                        Psychometric analysis is not yet available for this session.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {currentStep === "analytics" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Insights</h2>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Analytics will appear here once you have completed interviews.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
