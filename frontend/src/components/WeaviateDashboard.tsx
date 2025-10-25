"use client";

import { useState, useEffect } from 'react';
import { useWeaviate } from '@/hooks/useWeaviate';

interface InterviewSession {
  sessionId: string;
  planId: string;
  respondentName: string;
  respondentEmail: string;
  userRole: string;
  company: string;
  productArea: string;
  startTime: string;
  endTime: string;
  status: string;
  beyondPresenceSessionId: string;
  recordingUrl: string;
}

interface Analytics {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  byProductArea: Record<string, number>;
  byUserRole: Record<string, number>;
}

export default function WeaviateDashboard() {
  const {
    isConnected,
    isLoading,
    error,
    connect,
    createCollections,
    getInterviewSessions,
    getAnalytics,
    getResearchGoals,
    getInterviewPlans,
  } = useWeaviate();

  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InterviewSession[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'goals' | 'plans'>('sessions');
  const [researchGoals, setResearchGoals] = useState<any[]>([]);
  const [interviewPlans, setInterviewPlans] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected) {
      loadData();
    }
  }, [isConnected]);

  const loadData = async () => {
    try {
      const [sessionsData, analyticsData, goalsResult, plansResult] = await Promise.all([
        getInterviewSessions(20),
        getAnalytics('overview'),
        getResearchGoals(),
        getInterviewPlans(),
      ]);
      setSessions(sessionsData);
      setAnalytics(analyticsData);
      
      if (goalsResult.success) {
        setResearchGoals(goalsResult.goals || []);
      }
      
      if (plansResult.success) {
        setInterviewPlans(plansResult.plans || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCreateCollections = async () => {
    try {
      await createCollections();
      await loadData();
    } catch (error) {
      console.error('Error creating collections:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const results = await getInterviewSessions(20);
      const filtered = results.filter(session =>
        session.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.transcript.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Weaviate Connection Required
          </h2>
          <p className="text-red-600 mb-4">
            Please connect to Weaviate to view the dashboard.
          </p>
          <button
            onClick={connect}
            disabled={isLoading}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect to Weaviate'}
          </button>
          {error && (
            <p className="text-red-600 mt-2 text-sm">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Product User Interview Analytics Dashboard</h1>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleCreateCollections}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Initialize Collections'}
          </button>
          
          <button
            onClick={loadData}
            disabled={isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'sessions', label: 'Interview Sessions', count: sessions.length },
              { id: 'goals', label: 'Research Goals', count: researchGoals.length },
              { id: 'plans', label: 'Interview Plans', count: interviewPlans.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Sessions</h3>
            <p className="text-2xl font-bold text-gray-900">{analytics.totalSessions}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Completed</h3>
            <p className="text-2xl font-bold text-gray-900">{analytics.completedSessions}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
            <p className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'sessions' && (
        <>
          {/* Search */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Search
              </button>
            </div>
          </div>

      {/* Sessions List */}
        <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            User Interview Sessions {searchResults.length > 0 && `(${searchResults.length} results)`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Respondent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(searchResults.length > 0 ? searchResults : sessions).map((session) => (
                <tr key={session.sessionId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {session.respondentName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.respondentEmail}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.userRole}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.productArea}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : session.status === 'active'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.planId ? session.planId.substring(0, 8) + '...' : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(session.startTime).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Research Goals Tab */}
      {activeTab === 'goals' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Research Goals ({researchGoals.length})
            </h2>
          </div>
          <div className="p-6">
            {researchGoals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No research goals found.</p>
            ) : (
              <div className="space-y-4">
                {researchGoals.map((goal) => (
                  <div key={goal.goalId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{goal.goalText}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        goal.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : goal.status === 'clarifying' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {goal.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Target:</span> {goal.targetAudience} • 
                      <span className="font-medium ml-2">Duration:</span> {goal.duration} min
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(goal.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interview Plans Tab */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Interview Plans ({interviewPlans.length})
            </h2>
          </div>
          <div className="p-6">
            {interviewPlans.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No interview plans found.</p>
            ) : (
              <div className="space-y-4">
                {interviewPlans.map((plan) => (
                  <div key={plan.planId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">Plan v{plan.version}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        plan.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Questions:</span> {plan.questions?.length || 0} • 
                      <span className="font-medium ml-2">Duration:</span> {plan.estimatedDuration} min
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(plan.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
