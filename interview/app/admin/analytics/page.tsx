"use client";

import { useState, useEffect } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { TrendingUp, Users, Clock, Brain, Target } from "lucide-react";

interface PsychometricProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  enneagramType: number;
  explanation: string;
}

interface SessionData {
  id: string;
  researchGoal: string;
  status: string;
  participantEmail: string;
  createdAt: string;
  transcript: string;
  summaries: any[];
  psychometricProfile: PsychometricProfile;
  evaluationMetrics: any;
}

export default function AnalyticsDashboard() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const totalParticipants = completedSessions.length;
  const averageSessionDuration = "12.5 minutes"; // This would be calculated from actual data

  // Prepare data for radar chart
  const radarData = selectedSession?.psychometricProfile ? [
    { trait: 'Openness', value: selectedSession.psychometricProfile.openness },
    { trait: 'Conscientiousness', value: selectedSession.psychometricProfile.conscientiousness },
    { trait: 'Extraversion', value: selectedSession.psychometricProfile.extraversion },
    { trait: 'Agreeableness', value: selectedSession.psychometricProfile.agreeableness },
    { trait: 'Neuroticism', value: selectedSession.psychometricProfile.neuroticism },
  ] : [];

  // Prepare data for trait distribution chart
  const traitDistribution = completedSessions.reduce((acc, session) => {
    if (session.psychometricProfile) {
      acc.push({
        session: session.id.slice(0, 8),
        openness: session.psychometricProfile.openness,
        conscientiousness: session.psychometricProfile.conscientiousness,
        extraversion: session.psychometricProfile.extraversion,
        agreeableness: session.psychometricProfile.agreeableness,
        neuroticism: session.psychometricProfile.neuroticism,
      });
    }
    return acc;
  }, [] as any[]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights from your interview sessions</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Participants</p>
                <p className="text-2xl font-bold text-gray-900">{totalParticipants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Duration</p>
                <p className="text-2xl font-bold text-gray-900">{averageSessionDuration}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Profiles Generated</p>
                <p className="text-2xl font-bold text-gray-900">{completedSessions.filter(s => s.psychometricProfile).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">87%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Session List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Interview Sessions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {completedSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSession?.id === session.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {session.participantEmail || 'Anonymous'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {session.researchGoal.slice(0, 60)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Completed
                        </span>
                        {session.psychometricProfile && (
                          <p className="text-xs text-gray-500 mt-1">
                            Type {session.psychometricProfile.enneagramType}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Psychometric Profile */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Psychometric Profile</h2>
            </div>
            <div className="p-6">
              {selectedSession?.psychometricProfile ? (
                <div className="space-y-6">
                  {/* Radar Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="trait" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                          name="Personality Traits"
                          dataKey="value"
                          stroke="#3B82F6"
                          fill="#3B82F6"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Enneagram Type */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Enneagram Type</h3>
                    <div className="flex items-center">
                      <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                        <span className="text-xl font-bold text-blue-600">
                          {selectedSession.psychometricProfile.enneagramType}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Type {selectedSession.psychometricProfile.enneagramType}</p>
                        <p className="text-sm text-gray-600">
                          {selectedSession.psychometricProfile.explanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Scores */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Detailed Scores</h3>
                    {Object.entries(selectedSession.psychometricProfile)
                      .filter(([key]) => key !== 'enneagramType' && key !== 'explanation')
                      .map(([trait, score]) => (
                        <div key={trait} className="flex items-center justify-between">
                          <span className="capitalize text-gray-700">{trait}</span>
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${score}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">
                              {score}/100
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a session to view psychometric profile</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trait Distribution Chart */}
        {traitDistribution.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Trait Distribution Across Sessions</h2>
            </div>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={traitDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="session" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="openness" fill="#3B82F6" name="Openness" />
                    <Bar dataKey="conscientiousness" fill="#10B981" name="Conscientiousness" />
                    <Bar dataKey="extraversion" fill="#F59E0B" name="Extraversion" />
                    <Bar dataKey="agreeableness" fill="#EF4444" name="Agreeableness" />
                    <Bar dataKey="neuroticism" fill="#8B5CF6" name="Neuroticism" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Session Details */}
        {selectedSession && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Session Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Research Goal</h3>
                  <p className="text-gray-700">{selectedSession.researchGoal}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Key Insights</h3>
                  <div className="space-y-2">
                    {selectedSession.summaries.map((summary, index) => (
                      <div key={index} className="bg-gray-50 rounded p-3">
                        <p className="text-sm text-gray-700">{summary.summary}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {summary.keyThemes?.map((theme: string, i: number) => (
                            <span key={i} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
