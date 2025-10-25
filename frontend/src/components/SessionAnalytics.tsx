"use client";

import { useState, useEffect } from 'react';
import { useWeaviate } from '@/hooks/useWeaviate';

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

interface SessionAnalyticsProps {
  sessionId: string;
}

export default function SessionAnalytics({ sessionId }: SessionAnalyticsProps) {
  const { 
    getTranscriptChunks, 
    getSummaryChunks, 
    getPsychometricProfile, 
    getEvaluationMetrics 
  } = useWeaviate();

  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
  const [summaryChunks, setSummaryChunks] = useState<SummaryChunk[]>([]);
  const [psychometricProfile, setPsychometricProfile] = useState<PsychometricProfile | null>(null);
  const [evaluationMetrics, setEvaluationMetrics] = useState<EvaluationMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'psychometric' | 'evaluation'>('transcript');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load transcript chunks
      const transcriptResult = await getTranscriptChunks(sessionId);
      if (transcriptResult.success) {
        setTranscriptChunks(transcriptResult.chunks || []);
      }

      // Load summary chunks
      const summaryResult = await getSummaryChunks(sessionId);
      if (summaryResult.success) {
        setSummaryChunks(summaryResult.summaries || []);
      }

      // Load psychometric profile
      const profileResult = await getPsychometricProfile(sessionId);
      if (profileResult.success && profileResult.profiles?.length > 0) {
        setPsychometricProfile(profileResult.profiles[0]);
      }

      // Load evaluation metrics
      const metricsResult = await getEvaluationMetrics(sessionId);
      if (metricsResult.success) {
        setEvaluationMetrics(metricsResult.metrics || []);
      }
    } catch (err) {
      setError('Failed to load session analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Analytics</h1>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'transcript', label: 'Transcript', count: transcriptChunks.length },
              { id: 'summary', label: 'Summary', count: summaryChunks.length },
              { id: 'psychometric', label: 'Psychometric', count: psychometricProfile ? 1 : 0 },
              { id: 'evaluation', label: 'Evaluation', count: evaluationMetrics.length },
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Transcript Tab */}
      {activeTab === 'transcript' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Interview Transcript</h2>
          </div>
          <div className="p-6">
            {transcriptChunks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No transcript data available.</p>
            ) : (
              <div className="space-y-4">
                {transcriptChunks.map((chunk) => (
                  <div key={chunk.chunkId} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        chunk.speaker === 'interviewer' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {chunk.speaker}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(chunk.sentiment)}`}>
                        {chunk.sentiment}
                      </span>
                      <span className={`text-xs ${getConfidenceColor(chunk.confidence)}`}>
                        {Math.round(chunk.confidence * 100)}% confidence
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(chunk.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{chunk.text}</p>
                    {chunk.topic && (
                      <p className="text-xs text-gray-500 mt-1">Topic: {chunk.topic}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">AI-Generated Summaries</h2>
          </div>
          <div className="p-6">
            {summaryChunks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No summary data available.</p>
            ) : (
              <div className="space-y-6">
                {summaryChunks.map((summary) => (
                  <div key={summary.summaryId} className="border rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
                      <p className="text-gray-700">{summary.summary}</p>
                    </div>
                    
                    {summary.keyInsights.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Key Insights</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.keyInsights.map((insight, index) => (
                            <li key={index} className="text-gray-700">{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.painPoints.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Pain Points</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.painPoints.map((pain, index) => (
                            <li key={index} className="text-red-700">{pain}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.featureRequests.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Feature Requests</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {summary.featureRequests.map((request, index) => (
                            <li key={index} className="text-blue-700">{request}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.keywords.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {summary.keywords.map((keyword, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Generated: {new Date(summary.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Psychometric Tab */}
      {activeTab === 'psychometric' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Psychometric Profile</h2>
          </div>
          <div className="p-6">
            {!psychometricProfile ? (
              <p className="text-gray-500 text-center py-8">No psychometric profile available.</p>
            ) : (
              <div className="space-y-6">
                {/* Big Five Scores */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Big Five Personality Traits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'Openness', value: psychometricProfile.openness, color: 'bg-blue-500' },
                      { name: 'Conscientiousness', value: psychometricProfile.conscientiousness, color: 'bg-green-500' },
                      { name: 'Extraversion', value: psychometricProfile.extraversion, color: 'bg-yellow-500' },
                      { name: 'Agreeableness', value: psychometricProfile.agreeableness, color: 'bg-purple-500' },
                      { name: 'Neuroticism', value: psychometricProfile.neuroticism, color: 'bg-red-500' },
                    ].map((trait) => (
                      <div key={trait.name} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">{trait.name}</span>
                          <span className="text-sm text-gray-600">{trait.value.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${trait.color}`}
                            style={{ width: `${trait.value * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enneagram Type */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Enneagram Type</h3>
                  <p className="text-gray-700">Type {psychometricProfile.enneagramType}</p>
                </div>

                {/* Reasoning */}
                {psychometricProfile.reasoning && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Analysis Reasoning</h3>
                    <p className="text-gray-700">{psychometricProfile.reasoning}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Generated: {new Date(psychometricProfile.createdAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evaluation Tab */}
      {activeTab === 'evaluation' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Evaluation Metrics</h2>
          </div>
          <div className="p-6">
            {evaluationMetrics.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No evaluation metrics available.</p>
            ) : (
              <div className="space-y-4">
                {evaluationMetrics.map((metric) => (
                  <div key={metric.metricId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 capitalize">
                        {metric.metricType.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          metric.score >= 0.8 ? 'text-green-600' :
                          metric.score >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {Math.round(metric.score * 100)}%
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              metric.score >= 0.8 ? 'bg-green-500' :
                              metric.score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${metric.score * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {metric.explanation && (
                      <p className="text-gray-700 text-sm">{metric.explanation}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      Phoenix Trace: {metric.phoenixTraceId} • {new Date(metric.createdAt).toLocaleString()}
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
