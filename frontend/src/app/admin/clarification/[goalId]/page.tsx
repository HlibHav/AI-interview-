"use client";

import { useState, useEffect } from 'react';
import { useWeaviate } from '@/hooks/useWeaviate';

interface ClarificationLog {
  logId: string;
  goalId: string;
  question: string;
  answer: string;
  timestamp: string;
  agent: string;
}

interface ResearchGoal {
  goalId: string;
  goalText: string;
  targetAudience: string;
  sensitiveTopics: string[];
  duration: number;
  adminEmail: string;
  createdAt: string;
  status: string;
}

export default function ClarificationPage({ params }: { params: { goalId: string } }) {
  const { getClarificationLog, addClarification, getResearchGoals } = useWeaviate();
  const [goal, setGoal] = useState<ResearchGoal | null>(null);
  const [logs, setLogs] = useState<ClarificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load the research goal
      const goalsResult = await getResearchGoals();
      if (goalsResult.success) {
        const foundGoal = goalsResult.goals?.find((g: ResearchGoal) => g.goalId === params.goalId);
        setGoal(foundGoal || null);
      }

      // Load clarification logs
      const logsResult = await getClarificationLog(params.goalId);
      if (logsResult.success) {
        setLogs(logsResult.logs || []);
      } else {
        setError('Failed to load clarification logs');
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await addClarification({
        goalId: params.goalId,
        question: newQuestion,
        answer: newAnswer,
        agent: 'admin',
      });

      if (result.success) {
        setNewQuestion('');
        setNewAnswer('');
        await loadData();
      } else {
        setError(result.error || 'Failed to add clarification');
      }
    } catch (err) {
      setError('Failed to add clarification');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.goalId]);

  if (!goal) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Research Goal Not Found</h1>
          <p className="text-gray-600">The research goal with ID {params.goalId} could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Clarification Chat</h1>
        
        {/* Research Goal Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Research Goal</h2>
          <p className="text-gray-700 mb-4">{goal.goalText}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Target Audience:</span> {goal.targetAudience}
            </div>
            <div>
              <span className="font-medium">Duration:</span> {goal.duration} minutes
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                goal.status === 'approved' 
                  ? 'bg-green-100 text-green-800' 
                  : goal.status === 'clarifying' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {goal.status}
              </span>
            </div>
            <div>
              <span className="font-medium">Sensitive Topics:</span> {goal.sensitiveTopics.join(', ') || 'None'}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Clarification Logs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Clarification History ({logs.length})
          </h2>
        </div>
        <div className="p-6">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No clarifications yet. Add the first one below.</p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.logId} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="mb-2">
                    <span className="font-medium text-gray-900">Q:</span>
                    <span className="ml-2 text-gray-700">{log.question}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-medium text-gray-900">A:</span>
                    <span className="ml-2 text-gray-700">{log.answer}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()} • {log.agent}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add New Clarification */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Clarification</h2>
        </div>
        <form onSubmit={handleAddClarification} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question
            </label>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="What needs clarification about this research goal?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer
            </label>
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Provide clarification details..."
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || !newQuestion.trim() || !newAnswer.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Clarification'}
            </button>
            <button
              type="button"
              onClick={() => {
                setNewQuestion('');
                setNewAnswer('');
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
