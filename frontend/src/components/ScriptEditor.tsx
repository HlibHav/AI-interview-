"use client";

import { startTransition, useEffect, useState } from "react";
import { FileText, Edit3, Plus, Trash2, CheckCircle, RotateCcw } from "lucide-react";
import type { InterviewScript } from "@/types/interview";

interface Question {
  id: string;
  text: string;
  topic: string;
  followUps: string[];
  intent?: string;
}

interface ScriptEditorProps {
  script: InterviewScript | null;
  onScriptGenerated: () => void;
}

const DEFAULT_INTRODUCTION =
  "Thank you for participating in this research interview. I'm an AI interviewer, and I'll be asking you some questions about your experiences. There are no right or wrong answers - I'm just interested in hearing your honest thoughts and experiences. The interview will take about 30 minutes, and everything you share will be kept confidential.";

const DEFAULT_CLOSING =
  "Thanks so much for sharing your perspective today. Your input is extremely valuable and will help us shape future improvements. If you think of anything else after the session, feel free to share it with us.";

export default function ScriptEditor({ script, onScriptGenerated }: ScriptEditorProps) {
  const [introduction, setIntroduction] = useState(DEFAULT_INTRODUCTION);
  const [closing, setClosing] = useState(DEFAULT_CLOSING);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [newQuestion, setNewQuestion] = useState({ text: "", topic: "" });

  useEffect(() => {
    if (!script) {
      return;
    }

    startTransition(() => {
      setIntroduction(script.introduction || DEFAULT_INTRODUCTION);
      setClosing(script.closing || DEFAULT_CLOSING);
      setQuestions(
        script.questions.map((question, index) => ({
          id: (index + 1).toString(),
          text: question.question,
          topic: question.intent || `Topic ${index + 1}`,
          followUps: [],
          intent: question.intent,
        }))
      );
    });
  }, [script]);

  const handleAddQuestion = () => {
    if (newQuestion.text.trim()) {
      const question: Question = {
        id: Date.now().toString(),
        text: newQuestion.text,
        topic: newQuestion.topic || "General",
        followUps: []
      };
      setQuestions([...questions, question]);
      setNewQuestion({ text: "", topic: "" });
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleRegenerateScript = () => {
    setQuestions([]);
    setIntroduction(DEFAULT_INTRODUCTION);
    setClosing(DEFAULT_CLOSING);
  };

  const handleApproveScript = () => {
    onScriptGenerated();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <FileText className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Script Editor</h2>
        <p className="text-gray-600">
          Review and customize the AI-generated interview script. You can edit questions, add new ones, or regenerate the entire script.
        </p>
      </div>

      {/* Introduction */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <Edit3 className="w-5 h-5 mr-2" />
          Introduction
        </h3>
        <textarea
          value={introduction}
          onChange={(e) => setIntroduction(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      {/* Closing */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Closing Statement
        </h3>
        <textarea
          value={closing}
          onChange={(e) => setClosing(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      {/* Questions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Interview Questions</h3>
          <button
            onClick={handleRegenerateScript}
            className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Regenerate Script
          </button>
        </div>

        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
              Once the clarification chat confirms the scope, interview questions will appear here. You can also add your own questions below.
            </div>
          ) : (
            questions.map((question, index) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-3">
                      Q{index + 1}
                    </span>
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {question.topic || "General"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-gray-900 mb-3">{question.text}</p>

                {question.followUps.length > 0 && (
                  <div className="ml-4">
                    <p className="text-sm text-gray-600 mb-2">Follow-up questions:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {question.followUps.map((followUp, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-gray-400 mr-2">•</span>
                          {followUp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add New Question */}
        <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Question</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Question text..."
              value={newQuestion.text}
              onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
            />
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Topic (optional)"
                value={newQuestion.topic}
                onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              />
              <button
                onClick={handleAddQuestion}
                disabled={!newQuestion.text.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleRegenerateScript}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Regenerate Script
        </button>
        <button
          onClick={handleApproveScript}
          className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Approve & Generate Session
        </button>
      </div>
    </div>
  );
}
