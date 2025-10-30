"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface AnalysisProgressProps {
  sessionId: string;
  sessionStatus: string;
  hasTranscript: boolean;
  hasSummary: boolean;
  hasPsychometricProfile: boolean;
}

interface AnalysisStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  description: string;
  estimatedTime?: string;
}

export default function AnalysisProgressBar({ 
  sessionId, 
  sessionStatus, 
  hasTranscript, 
  hasSummary, 
  hasPsychometricProfile 
}: AnalysisProgressProps) {
  const [steps, setSteps] = useState<AnalysisStep[]>([
    {
      id: 'transcript',
      name: 'Transcript Processing',
      status: 'pending',
      description: 'Processing interview transcript and generating embeddings',
      estimatedTime: '30 seconds'
    },
    {
      id: 'summary',
      name: 'Summary Generation',
      status: 'pending',
      description: 'AI summarizer analyzing conversation and extracting key insights',
      estimatedTime: '1-2 minutes'
    },
    {
      id: 'psychometric',
      name: 'Psychometric Analysis',
      status: 'pending',
      description: 'Analyzing personality traits and behavioral patterns',
      estimatedTime: '2-3 minutes'
    }
  ]);

  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  // Update step statuses based on session data
  useEffect(() => {
    setSteps(prevSteps => {
      const updatedSteps = [...prevSteps];
      
      // Update transcript step
      if (hasTranscript) {
        updatedSteps[0] = { ...updatedSteps[0], status: 'completed' };
      } else if (sessionStatus === 'completed') {
        updatedSteps[0] = { ...updatedSteps[0], status: 'in_progress' };
        setCurrentStep('transcript');
      }

      // Update summary step
      if (hasSummary) {
        updatedSteps[1] = { ...updatedSteps[1], status: 'completed' };
      } else if (hasTranscript && !hasSummary) {
        updatedSteps[1] = { ...updatedSteps[1], status: 'in_progress' };
        setCurrentStep('summary');
      }

      // Update psychometric step
      if (hasPsychometricProfile) {
        updatedSteps[2] = { ...updatedSteps[2], status: 'completed' };
      } else if (hasSummary && !hasPsychometricProfile) {
        updatedSteps[2] = { ...updatedSteps[2], status: 'in_progress' };
        setCurrentStep('psychometric');
      }

      return updatedSteps;
    });
  }, [hasTranscript, hasSummary, hasPsychometricProfile, sessionStatus]);

  // Calculate overall progress
  useEffect(() => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const totalSteps = steps.length;
    const progress = (completedSteps / totalSteps) * 100;
    setOverallProgress(progress);
  }, [steps]);

  // Check if analysis is complete
  const isAnalysisComplete = steps.every(step => step.status === 'completed');
  const hasError = steps.some(step => step.status === 'error');

  const getStepIcon = (step: AnalysisStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStatusColor = (step: AnalysisStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isAnalysisComplete) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-green-800">Analysis Complete</h3>
            <p className="text-sm text-green-700">All analysis steps have been completed successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Analysis Error</h3>
            <p className="text-sm text-red-700">There was an error during the analysis process. Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Analysis in Progress</h3>
          <span className="text-sm font-medium text-gray-600">{Math.round(overallProgress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={`border rounded-lg p-4 transition-all duration-300 ${getStepStatusColor(step)}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3 mt-0.5">
                {getStepIcon(step)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{step.name}</h4>
                  {step.status === 'in_progress' && step.estimatedTime && (
                    <span className="text-xs text-gray-500">~{step.estimatedTime}</span>
                  )}
                </div>
                <p className="text-sm mt-1 opacity-90">{step.description}</p>
                {step.status === 'in_progress' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Analysis Status</h4>
            <p className="text-sm text-blue-700 mt-1">
              {currentStep ? (
                <>Currently processing: <span className="font-medium">{steps.find(s => s.id === currentStep)?.name}</span></>
              ) : (
                'Preparing analysis...'
              )}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              This analysis typically takes 3-5 minutes to complete. Results will appear automatically when ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
