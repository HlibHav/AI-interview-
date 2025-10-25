"use client";

import { useState, useEffect } from 'react';
import { useWeaviate } from '@/hooks/useWeaviate';

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

export default function ResearchGoalsPage() {
  const { createResearchGoal, getResearchGoals } = useWeaviate();
  const [goals, setGoals] = useState<ResearchGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goalText: '',
    targetAudience: '',
    sensitiveTopics: [] as string[],
    duration: 15,
    adminEmail: '',
  });

  const loadGoals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getResearchGoals();
      if (result.success) {
        setGoals(result.goals || []);
      } else {
        setError('Failed to load research goals');
      }
    } catch (err) {
      setError('Failed to load research goals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await createResearchGoal({
        ...newGoal,
        status: 'draft',
      });

      if (result.success) {
        setNewGoal({
          goalText: '',
          targetAudience: '',
          sensitiveTopics: [],
          duration: 15,
          adminEmail: '',
        });
        setShowCreateForm(false);
        await loadGoals();
      } else {
        setError(result.error || 'Failed to create research goal');
      }
    } catch (err) {
      setError('Failed to create research goal');
    } finally {
      setIsLoading(false);
    }
  };

  const addSensitiveTopic = () => {
    setNewGoal(prev => ({
      ...prev,
      sensitiveTopics: [...prev.sensitiveTopics, '']
    }));
  };

  const updateSensitiveTopic = (index: number, value: string) => {
    setNewGoal(prev => ({
      ...prev,
      sensitiveTopics: prev.sensitiveTopics.map((topic, i) => i === index ? value : topic)
    }));
  };

  const removeSensitiveTopic = (index: number) => {
    setNewGoal(prev => ({
      ...prev,
      sensitiveTopics: prev.sensitiveTopics.filter((_, i) => i !== index)
    }));
  };

  useEffect(() => {
    loadGoals();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Research Goals Management</h1>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'Create New Goal'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Create Goal Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Research Goal</h2>
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Research Goal
              </label>
              <textarea
                value={newGoal.goalText}
                onChange={(e) => setNewGoal(prev => ({ ...prev, goalText: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <input
                type="text"
                value={newGoal.targetAudience}
                onChange={(e) => setNewGoal(prev => ({ ...prev, targetAudience: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sensitive Topics
              </label>
              {newGoal.sensitiveTopics.map((topic, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => updateSensitiveTopic(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter sensitive topic"
                  />
                  <button
                    type="button"
                    onClick={() => removeSensitiveTopic(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSensitiveTopic}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                + Add Sensitive Topic
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={newGoal.duration}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="60"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={newGoal.adminEmail}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, adminEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Goal'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Research Goals ({goals.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Goal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target Audience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {goals.map((goal) => (
                <tr key={goal.goalId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {goal.goalText.length > 100 
                        ? `${goal.goalText.substring(0, 100)}...` 
                        : goal.goalText
                      }
                    </div>
                    <div className="text-sm text-gray-500">
                      {goal.sensitiveTopics.length > 0 && (
                        <span>Sensitive: {goal.sensitiveTopics.join(', ')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {goal.targetAudience}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {goal.duration} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      goal.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : goal.status === 'clarifying' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {goal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(goal.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
