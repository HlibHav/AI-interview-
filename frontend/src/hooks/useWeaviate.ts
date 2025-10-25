"use client";

import { useState, useEffect } from 'react';

interface WeaviateConfig {
  url: string;
  apiKey: string;
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

interface ClarificationLog {
  logId: string;
  goalId: string;
  question: string;
  answer: string;
  timestamp: string;
  agent: string;
}

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

interface TranscriptChunk {
  chunkId: string;
  sessionId: string;
  speaker: string;
  text: string;
  timestamp: string;
  questionId: string;
  topic: string;
  sentiment: string;
  confidence: number;
}

interface SummaryChunk {
  summaryId: string;
  sessionId: string;
  chunkId: string;
  summary: string;
  keywords: string[];
  keyInsights: string[];
  painPoints: string[];
  featureRequests: string[];
  createdAt: string;
}

interface PsychometricProfile {
  profileId: string;
  sessionId: string;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  enneagramType: number;
  reasoning: string;
  createdAt: string;
}

interface EvaluationMetric {
  metricId: string;
  sessionId: string;
  metricType: string;
  score: number;
  explanation: string;
  phoenixTraceId: string;
  createdAt: string;
}

interface InterviewQuestion {
  questionId: string;
  sessionId: string;
  question: string;
  category: string;
  difficulty: string;
  timestamp: string;
}

interface UserResponse {
  responseId: string;
  sessionId: string;
  questionId: string;
  response: string;
  timestamp: string;
  sentiment: string;
  confidence: number;
  followUpNeeded: boolean;
}

export const useWeaviate = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/weaviate/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect to Weaviate');
      }
      
      const result = await response.json();
      setIsConnected(result.connected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const createCollections = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/weaviate/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create collections');
      }
      
      const result = await response.json();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getInterviewSessions = async (limit: number = 20) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/weaviate/interview-sessions?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch interview sessions');
      }
      
      const result = await response.json();
      return result.sessions || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getAnalytics = async (type: string = 'overview') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/weaviate/analytics?type=${type}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const result = await response.json();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const insertInterviewSession = async (session: Partial<InterviewSession>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/weaviate/interview-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });
      
      if (!response.ok) {
        throw new Error('Failed to insert interview session');
      }
      
      const result = await response.json();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const searchSessions = async (query: string, limit: number = 10) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/weaviate/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to search sessions');
      }
      
      const result = await response.json();
      return result.results || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Research Goals methods
  const createResearchGoal = async (goalData: Partial<ResearchGoal>) => {
    try {
      const response = await fetch('/api/weaviate/research-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating research goal:', error);
      return { success: false, error: 'Failed to create research goal' };
    }
  };

  const getResearchGoals = async (status?: string) => {
    try {
      const url = status ? `/api/weaviate/research-goals?status=${status}` : '/api/weaviate/research-goals';
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error fetching research goals:', error);
      return { success: false, error: 'Failed to fetch research goals' };
    }
  };

  // Clarification Logs methods
  const addClarification = async (logData: Partial<ClarificationLog>) => {
    try {
      const response = await fetch('/api/weaviate/clarification-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding clarification:', error);
      return { success: false, error: 'Failed to add clarification' };
    }
  };

  const getClarificationLog = async (goalId: string) => {
    try {
      const response = await fetch(`/api/weaviate/clarification-logs?goalId=${goalId}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching clarification log:', error);
      return { success: false, error: 'Failed to fetch clarification log' };
    }
  };

  // Interview Plans methods
  const createInterviewPlan = async (planData: Partial<InterviewPlan>) => {
    try {
      const response = await fetch('/api/weaviate/interview-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating interview plan:', error);
      return { success: false, error: 'Failed to create interview plan' };
    }
  };

  const getInterviewPlans = async (goalId?: string, status?: string) => {
    try {
      let url = '/api/weaviate/interview-plans?';
      const params = new URLSearchParams();
      if (goalId) params.append('goalId', goalId);
      if (status) params.append('status', status);
      url += params.toString();
      
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error fetching interview plans:', error);
      return { success: false, error: 'Failed to fetch interview plans' };
    }
  };

  // Transcript Chunks methods
  const addTranscriptChunk = async (chunkData: Partial<TranscriptChunk>) => {
    try {
      const response = await fetch('/api/weaviate/transcript-chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunkData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding transcript chunk:', error);
      return { success: false, error: 'Failed to add transcript chunk' };
    }
  };

  const getTranscriptChunks = async (sessionId: string, speaker?: string) => {
    try {
      let url = `/api/weaviate/transcript-chunks?sessionId=${sessionId}`;
      if (speaker) url += `&speaker=${speaker}`;
      
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error fetching transcript chunks:', error);
      return { success: false, error: 'Failed to fetch transcript chunks' };
    }
  };

  // Summary Chunks methods
  const addSummaryChunk = async (summaryData: Partial<SummaryChunk>) => {
    try {
      const response = await fetch('/api/weaviate/summary-chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding summary chunk:', error);
      return { success: false, error: 'Failed to add summary chunk' };
    }
  };

  const getSummaryChunks = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/weaviate/summary-chunks?sessionId=${sessionId}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching summary chunks:', error);
      return { success: false, error: 'Failed to fetch summary chunks' };
    }
  };

  // Psychometric Profiles methods
  const savePsychometricProfile = async (profileData: Partial<PsychometricProfile>) => {
    try {
      const response = await fetch('/api/weaviate/psychometric-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error saving psychometric profile:', error);
      return { success: false, error: 'Failed to save psychometric profile' };
    }
  };

  const getPsychometricProfile = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/weaviate/psychometric-profiles?sessionId=${sessionId}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching psychometric profile:', error);
      return { success: false, error: 'Failed to fetch psychometric profile' };
    }
  };

  // Evaluation Metrics methods
  const addEvaluationMetric = async (metricData: Partial<EvaluationMetric>) => {
    try {
      const response = await fetch('/api/weaviate/evaluation-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metricData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding evaluation metric:', error);
      return { success: false, error: 'Failed to add evaluation metric' };
    }
  };

  const getEvaluationMetrics = async (sessionId: string, metricType?: string) => {
    try {
      let url = `/api/weaviate/evaluation-metrics?sessionId=${sessionId}`;
      if (metricType) url += `&metricType=${metricType}`;
      
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error fetching evaluation metrics:', error);
      return { success: false, error: 'Failed to fetch evaluation metrics' };
    }
  };

  useEffect(() => {
    // Auto-connect on mount
    connect();
  }, []);

  return {
    isConnected,
    isLoading,
    error,
    connect,
    createCollections,
    getInterviewSessions,
    getAnalytics,
    insertInterviewSession,
    searchSessions,
    // New methods for multi-agent architecture
    createResearchGoal,
    getResearchGoals,
    addClarification,
    getClarificationLog,
    createInterviewPlan,
    getInterviewPlans,
    addTranscriptChunk,
    getTranscriptChunks,
    addSummaryChunk,
    getSummaryChunks,
    savePsychometricProfile,
    getPsychometricProfile,
    addEvaluationMetric,
    getEvaluationMetrics,
  };
};
