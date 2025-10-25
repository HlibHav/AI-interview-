"use client";

import { useMemo, useState } from "react";
import { Brain, MessageSquare, FileText, Users, BarChart3, Settings } from "lucide-react";
import ResearchGoalForm from "@/components/ResearchGoalForm";
import ClarificationChat from "@/components/ClarificationChat";
import ScriptEditor from "@/components/ScriptEditor";
import SessionList from "@/components/SessionList";
import ResultsAnalytics from "@/components/ResultsAnalytics";
import type { ChatMessage, ChatRole, InterviewScript } from "@/types/interview";

type DashboardTab = "goal" | "clarification" | "script" | "sessions" | "results" | "settings";


export default function ProductManagerDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("goal");
  const [researchGoal, setResearchGoal] = useState("");
  const [clarificationComplete, setClarificationComplete] = useState(false);
  const [scriptGenerated, setScriptGenerated] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [clarificationMessages, setClarificationMessages] = useState<ChatMessage[]>([]);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const [isStartingClarification, setIsStartingClarification] = useState(false);
  const [isSendingClarificationMessage, setIsSendingClarificationMessage] = useState(false);
  const [script, setScript] = useState<InterviewScript | null>(null);
  const [scriptMessageId, setScriptMessageId] = useState<string | null>(null);

  const fastApiBaseUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000").replace(/\/+$/, ""),
    []
  );

  const generateId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const createMessage = (
    role: ChatRole,
    content: string,
    extras?: Partial<Omit<ChatMessage, "id" | "role" | "content" | "timestamp">>
  ): ChatMessage => ({
    id: generateId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    ...extras,
  });

  const tabs = [
    { id: "goal" as const, label: "Research Goal", icon: Brain },
    { id: "clarification" as const, label: "Clarification", icon: MessageSquare },
    { id: "script" as const, label: "Script Editor", icon: FileText },
    { id: "sessions" as const, label: "Sessions", icon: Users },
    { id: "results" as const, label: "Results", icon: BarChart3 },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const handleGoalSubmit = async (goal: string) => {
    const trimmedGoal = goal.trim();

    setClarificationComplete(false);
    setScriptGenerated(false);
    setScript(null);
    setScriptMessageId(null);
    setClarificationMessages([]);
    setConversationId(null);
    setClarificationError(null);
    setResearchGoal(trimmedGoal);
    setIsStartingClarification(true);

    try {
      const response = await fetch(`${fastApiBaseUrl}/api/clarification/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ research_goal: trimmedGoal }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data?.detail ?? "Unable to start the clarification process.";
        throw new Error(detail);
      }

      const initialMessages: ChatMessage[] = Array.isArray(data?.messages)
        ? data.messages.map((message: { role: ChatRole; content: string }) =>
            createMessage(message.role, message.content)
          )
        : [];

      setClarificationMessages(initialMessages);
      setConversationId(data?.conversation_id ?? null);
      setActiveTab("clarification");

      if (data?.script) {
        const generatedScript: InterviewScript = data.script;
        handleScriptReady(generatedScript);
      }
    } catch (error) {
      setClarificationMessages([]);
      setConversationId(null);
      throw error instanceof Error ? error : new Error("Failed to start the clarification process.");
    } finally {
      setIsStartingClarification(false);
    }
  };

  const formatScriptMessage = (generatedScript: InterviewScript) => {
    const hasReminders = generatedScript.reminders && generatedScript.reminders.length > 0;
    const introPreview = generatedScript.introduction.length > 180
      ? `${generatedScript.introduction.slice(0, 177)}...`
      : generatedScript.introduction;

    const summaryLines = [
      "Here’s the finalized interview plan. Let me know if you'd like any changes before we move on.",
      "",
      `• Introduction focus: ${introPreview}`,
      `• Question count: ${generatedScript.questions.length}`,
      hasReminders ? `• Reminders included: ${generatedScript.reminders?.join(", ")}` : "• Reminders: none provided",
      "",
      "If you'd like me to save this plan to a JSON file in output_files, just tell me the file name (e.g., 'beta-launch.json').",
    ];

    return summaryLines.join("\n");
  };

  const handleScriptReady = (generatedScript: InterviewScript) => {
    setClarificationComplete(true);
    setScript(generatedScript);
    const scriptChatMessage = createMessage(
      "assistant",
      formatScriptMessage(generatedScript),
      { script: generatedScript }
    );

    setClarificationMessages(prev => {
      if (scriptMessageId) {
        return prev.map(msg => (msg.id === scriptMessageId ? scriptChatMessage : msg));
      }
      return [...prev, scriptChatMessage];
    });
    setScriptMessageId(scriptChatMessage.id);
  };

  const handleClarificationMessageSend = async (message: string) => {
    if (!conversationId) {
      throw new Error("Clarification session has not been started.");
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const userMessage = createMessage("user", trimmed);
    setClarificationMessages(prev => [...prev, userMessage]);
    setClarificationError(null);
    setIsSendingClarificationMessage(true);

    try {
      const response = await fetch(`${fastApiBaseUrl}/api/clarification/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: trimmed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data?.detail ?? "Failed to continue the clarification process.";
        throw new Error(detail);
      }

      if (Array.isArray(data?.messages)) {
        const assistantMessages = data.messages.map((msg: { role: ChatRole; content: string }) =>
          createMessage(msg.role, msg.content)
        );
        setClarificationMessages(prev => [...prev, ...assistantMessages]);
      }

      if (data?.script) {
        const generatedScript: InterviewScript = data.script;
        handleScriptReady(generatedScript);
      }
    } catch (error) {
      setClarificationError(
        error instanceof Error ? error.message : "Failed to continue the clarification process."
      );
      throw error instanceof Error ? error : new Error("Failed to continue the clarification process.");
    } finally {
      setIsSendingClarificationMessage(false);
    }
  };

  const handleScriptGenerated = () => {
    setScriptGenerated(true);
    setActiveTab("sessions");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Product Manager Dashboard</h1>
            </div>
            <div className="text-sm text-gray-500">
              AI Interview Assistant
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDisabled = 
                (tab.id === "clarification" && !researchGoal) ||
                (tab.id === "script" && !clarificationComplete) ||
                (tab.id === "sessions" && !scriptGenerated);

              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`
                    flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${isActive 
                      ? "border-blue-500 text-blue-600" 
                      : isDisabled 
                        ? "border-transparent text-gray-400 cursor-not-allowed"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === "goal" && (
            <ResearchGoalForm onSubmit={handleGoalSubmit} />
          )}
          
          {activeTab === "clarification" && researchGoal && (
            <ClarificationChat 
              conversationId={conversationId}
              messages={clarificationMessages}
              onSendMessage={handleClarificationMessageSend}
              isStarting={isStartingClarification}
              isSending={isSendingClarificationMessage}
              errorMessage={clarificationError}
              script={script}
            />
          )}
          
          {activeTab === "script" && clarificationComplete && (
            <ScriptEditor script={script} onScriptGenerated={handleScriptGenerated} />
          )}
          
          {activeTab === "sessions" && scriptGenerated && (
            <SessionList />
          )}
          
          {activeTab === "results" && (
            <ResultsAnalytics />
          )}
          
          {activeTab === "settings" && (
            <div className="text-center py-12">
              <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Settings</h3>
              <p className="text-gray-500">Configuration options will be available here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
