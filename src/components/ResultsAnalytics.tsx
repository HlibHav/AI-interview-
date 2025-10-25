"use client";

import { useState } from "react";
import { BarChart3, FileText, Brain, TrendingUp, Users, Clock } from "lucide-react";

interface AnalyticsData {
  totalSessions: number;
  completedSessions: number;
  averageDuration: number;
  totalParticipants: number;
  completionRate: number;
}

interface PsychometricProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export default function ResultsAnalytics() {
  const [analytics] = useState<AnalyticsData>({
    totalSessions: 12,
    completedSessions: 10,
    averageDuration: 28,
    totalParticipants: 10,
    completionRate: 83.3,
  });

  const [psychometricData] = useState<PsychometricProfile[]>([
    { openness: 75, conscientiousness: 82, extraversion: 68, agreeableness: 79, neuroticism: 45 },
    { openness: 68, conscientiousness: 75, extraversion: 85, agreeableness: 72, neuroticism: 38 },
    { openness: 82, conscientiousness: 70, extraversion: 62, agreeableness: 85, neuroticism: 52 },
  ]);

  const averagePsychometric = psychometricData.reduce(
    (acc, profile) => ({
      openness: acc.openness + profile.openness,
      conscientiousness: acc.conscientiousness + profile.conscientiousness,
      extraversion: acc.extraversion + profile.extraversion,
      agreeableness: acc.agreeableness + profile.agreeableness,
      neuroticism: acc.neuroticism + profile.neuroticism,
    }),
    { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 }
  );

  Object.keys(averagePsychometric).forEach(key => {
    averagePsychometric[key as keyof PsychometricProfile] = 
      Math.round(averagePsychometric[key as keyof PsychometricProfile] / psychometricData.length);
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <BarChart3 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Results & Analytics</h2>
        <p className="text-gray-600">
          View interview results, transcripts, and psychometric insights from completed sessions.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.completedSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.averageDuration}m</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Psychometric Analysis */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            Psychometric Analysis
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Average Big Five personality traits across all participants
          </p>
          
          <div className="space-y-4">
            {Object.entries(averagePsychometric).map(([trait, value]) => (
              <div key={trait}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-gray-700">{trait}</span>
                  <span className="text-gray-500">{value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Recent Sessions
          </h3>
          
          <div className="space-y-4">
            {[
              { id: "session-003", participant: "jane.smith@example.com", duration: "28 min", status: "completed" },
              { id: "session-002", participant: "john.doe@example.com", duration: "15 min", status: "in-progress" },
              { id: "session-001", participant: "Not joined", duration: "-", status: "pending" },
            ].map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{session.id}</p>
                  <p className="text-xs text-gray-500">{session.participant}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900">{session.duration}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    session.status === "completed" ? "bg-green-100 text-green-800" :
                    session.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Export Transcripts
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Export Analytics
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Export Psychometric Data
          </button>
        </div>
      </div>
    </div>
  );
}
