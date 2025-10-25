"use client";

import { useState } from "react";
import { Send, Target, Users, Clock, AlertTriangle } from "lucide-react";

interface ResearchGoalFormProps {
  onSubmit: (goal: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ResearchGoalForm({ onSubmit, isLoading = false }: ResearchGoalFormProps) {
  const [goal, setGoal] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [duration, setDuration] = useState("30");
  const [sensitiveTopics, setSensitiveTopics] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    
    const fullGoal = `${goal}\n\nTarget Audience: ${targetAudience}\nDuration: ${duration} minutes\nSensitive Topics: ${sensitiveTopics || "None"}`;
    
    try {
      await onSubmit(fullGoal);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start the clarification process.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Target className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Define Research Goal</h2>
        <p className="text-gray-600">
          Describe what you want to learn from the interviews. The AI will help clarify your objectives.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
            Research Goal *
          </label>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Understand how users interact with our mobile app's checkout process and identify pain points..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-500"
            rows={4}
            required
            disabled={isSubmitting || isLoading}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Target Audience
            </label>
            <input
              id="audience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Mobile app users, ages 25-45"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              disabled={isSubmitting || isLoading}
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Duration of interview (minutes)
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              disabled={isSubmitting || isLoading}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="sensitive" className="block text-sm font-medium text-gray-700 mb-2">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Sensitive Topics (optional)
          </label>
          <input
            id="sensitive"
            type="text"
            value={sensitiveTopics}
            onChange={(e) => setSensitiveTopics(e.target.value)}
            placeholder="e.g., Personal finances, health issues, family matters"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
            disabled={isSubmitting || isLoading}
          />
        </div>

        <div className="flex justify-end items-center gap-4">
          {errorMessage && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex-1">
              {errorMessage}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting || isLoading || !goal.trim()}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting || isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Start Clarification Process
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

