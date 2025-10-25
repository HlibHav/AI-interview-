"use client";

import { useState, useEffect } from 'react';
import { useWeaviate } from '@/hooks/useWeaviate';

interface InterviewPlan {
  planId: string;
  goalId: string;
  introduction: string;
  questions: string[];
  followUps: string[];
  estimatedDuration: number;
  version: number;
  status: string;
  createdAt: string;
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

export default function PlanEditorPage({ params }: { params: { planId: string } }) {
  const { getInterviewPlans, createInterviewPlan, getResearchGoals } = useWeaviate();
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [goal, setGoal] = useState<ResearchGoal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState({
    introduction: '',
    questions: [] as string[],
    followUps: [] as string[],
    estimatedDuration: 15,
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load the interview plan
      const plansResult = await getInterviewPlans();
      if (plansResult.success) {
        const foundPlan = plansResult.plans?.find((p: InterviewPlan) => p.planId === params.planId);
        setPlan(foundPlan || null);
        
        if (foundPlan) {
          setEditedPlan({
            introduction: foundPlan.introduction,
            questions: foundPlan.questions,
            followUps: foundPlan.followUps,
            estimatedDuration: foundPlan.estimatedDuration,
          });
        }
      }

      // Load the research goal if we have a plan
      if (plan?.goalId) {
        const goalsResult = await getResearchGoals();
        if (goalsResult.success) {
          const foundGoal = goalsResult.goals?.find((g: ResearchGoal) => g.goalId === plan.goalId);
          setGoal(foundGoal || null);
        }
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!plan) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await createInterviewPlan({
        planId: plan.planId,
        goalId: plan.goalId,
        introduction: editedPlan.introduction,
        questions: editedPlan.questions,
        followUps: editedPlan.followUps,
        estimatedDuration: editedPlan.estimatedDuration,
        version: plan.version + 1,
        status: 'draft',
      });

      if (result.success) {
        setIsEditing(false);
        await loadData();
      } else {
        setError(result.error || 'Failed to save plan');
      }
    } catch (err) {
      setError('Failed to save plan');
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = () => {
    setEditedPlan(prev => ({
      ...prev,
      questions: [...prev.questions, '']
    }));
  };

  const updateQuestion = (index: number, value: string) => {
    setEditedPlan(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? value : q)
    }));
  };

  const removeQuestion = (index: number) => {
    setEditedPlan(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const addFollowUp = () => {
    setEditedPlan(prev => ({
      ...prev,
      followUps: [...prev.followUps, '']
    }));
  };

  const updateFollowUp = (index: number, value: string) => {
    setEditedPlan(prev => ({
      ...prev,
      followUps: prev.followUps.map((f, i) => i === index ? value : f)
    }));
  };

  const removeFollowUp = (index: number) => {
    setEditedPlan(prev => ({
      ...prev,
      followUps: prev.followUps.filter((_, i) => i !== index)
    }));
  };

  useEffect(() => {
    loadData();
  }, [params.planId]);

  if (!plan) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Interview Plan Not Found</h1>
          <p className="text-gray-600">The interview plan with ID {params.planId} could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Plan Editor</h1>
            <p className="text-gray-600">Version {plan.version} • Created {new Date(plan.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Edit Plan
              </button>
            ) : (
              <>
                <button
                  onClick={handleSavePlan}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    loadData();
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {goal && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Research Goal</h3>
            <p className="text-gray-700">{goal.goalText}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Introduction */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Introduction</h2>
          </div>
          <div className="p-6">
            {isEditing ? (
              <textarea
                value={editedPlan.introduction}
                onChange={(e) => setEditedPlan(prev => ({ ...prev, introduction: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter the interview introduction..."
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{plan.introduction}</p>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Interview Questions</h2>
          </div>
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                {editedPlan.questions.map((question, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => updateQuestion(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Question ${index + 1}`}
                      />
                    </div>
                    <button
                      onClick={() => removeQuestion(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={addQuestion}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + Add Question
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {plan.questions.map((question, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <p className="text-gray-700">{question}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Follow-up Questions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Follow-up Questions</h2>
          </div>
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                {editedPlan.followUps.map((followUp, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={followUp}
                        onChange={(e) => updateFollowUp(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Follow-up ${index + 1}`}
                      />
                    </div>
                    <button
                      onClick={() => removeFollowUp(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={addFollowUp}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + Add Follow-up
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {plan.followUps.map((followUp, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                      F{index + 1}
                    </span>
                    <p className="text-gray-700">{followUp}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Estimated Duration</h2>
          </div>
          <div className="p-6">
            {isEditing ? (
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={editedPlan.estimatedDuration}
                  onChange={(e) => setEditedPlan(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="60"
                />
                <span className="text-gray-700">minutes</span>
              </div>
            ) : (
              <p className="text-gray-700">{plan.estimatedDuration} minutes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
