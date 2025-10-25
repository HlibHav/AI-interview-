"use client";

import { useState } from "react";
import { Send, Target, Users, Clock, AlertTriangle } from "lucide-react";

interface ResearchGoalFormProps {
  onSubmit: (goal: string) => void;
}

export default function ResearchGoalForm({ onSubmit }: ResearchGoalFormProps) {
  const [goal, setGoal] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [duration, setDuration] = useState("30");
  const [sensitiveTopics, setSensitiveTopics] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullGoal = `${goal}\n\nTarget Audience: ${targetAudience}\nDuration: ${duration} minutes\nSensitive Topics: ${sensitiveTopics}`;
    onSubmit(fullGoal);
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            required
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Duration (minutes)
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Send className="w-5 h-5 mr-2" />
            Start Clarification Process
          </button>
        </div>
      </form>
    </div>
  );
}
