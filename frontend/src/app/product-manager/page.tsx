"use client";

import { useState } from "react";
import { Brain, MessageSquare, FileText, Users, BarChart3, Settings } from "lucide-react";
import ResearchGoalForm from "@/components/ResearchGoalForm";
import ClarificationChat from "@/components/ClarificationChat";
import ScriptEditor from "@/components/ScriptEditor";
import SessionList from "@/components/SessionList";
import ResultsAnalytics from "@/components/ResultsAnalytics";

type DashboardTab = "goal" | "clarification" | "script" | "sessions" | "results" | "settings";

export default function ProductManagerDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("goal");
  const [researchGoal, setResearchGoal] = useState("");
  const [clarificationComplete, setClarificationComplete] = useState(false);
  const [scriptGenerated, setScriptGenerated] = useState(false);

  const tabs = [
    { id: "goal" as const, label: "Research Goal", icon: Brain },
    { id: "clarification" as const, label: "Clarification", icon: MessageSquare },
    { id: "script" as const, label: "Script Editor", icon: FileText },
    { id: "sessions" as const, label: "Sessions", icon: Users },
    { id: "results" as const, label: "Results", icon: BarChart3 },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const handleGoalSubmit = (goal: string) => {
    setResearchGoal(goal);
    setActiveTab("clarification");
  };

  const handleClarificationComplete = () => {
    setClarificationComplete(true);
    setActiveTab("script");
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
              researchGoal={researchGoal}
              onComplete={handleClarificationComplete}
            />
          )}
          
          {activeTab === "script" && clarificationComplete && (
            <ScriptEditor onScriptGenerated={handleScriptGenerated} />
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
