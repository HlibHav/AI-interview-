"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Bot, User, CheckCircle } from "lucide-react";
import type { ChatMessage, InterviewScript } from "@/types/interview";

interface ClarificationChatProps {
  conversationId: string | null;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isStarting: boolean;
  isSending: boolean;
  errorMessage: string | null;
  script: InterviewScript | null;
}

export default function ClarificationChat({
  conversationId,
  messages,
  onSendMessage,
  isStarting,
  isSending,
  errorMessage,
  script,
}: ClarificationChatProps) {
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isConversationReady = Boolean(conversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, script]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !isConversationReady || isSending) {
      return;
    }

    try {
      setLocalError(null);
      await onSendMessage(trimmed);
      setInput("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong while sending your message.";
      setLocalError(message);
    }
  };

  const combinedError = useMemo(() => localError ?? errorMessage ?? null, [localError, errorMessage]);

  const renderTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <Bot className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Clarification Chat</h2>
        <p className="text-gray-600">
          The AI assistant will refine your research scope before producing interview questions.
        </p>
        {script ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
            <CheckCircle className="w-4 h-4" />
            Scope confirmed! Interview questions are now available.
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg h-[28rem] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && isStarting ? (
            <div className="flex justify-center items-center h-full text-sm text-gray-500">
              Initializing clarification with your research goal&hellip;
            </div>
          ) : null}

          {messages.map(message => {
            const isUser = message.role === "user";
            const isSystem = message.role === "system";
            const alignment = isSystem ? "justify-center" : isUser ? "justify-end" : "justify-start";

            const bubbleClasses = (() => {
              if (message.script) {
                return "bg-indigo-50 text-indigo-900 border border-indigo-200";
              }
              if (isSystem) {
                return "bg-blue-50 text-blue-900 border border-blue-200";
              }
              if (isUser) {
                return "bg-blue-600 text-white";
              }
              return "bg-gray-100 text-gray-900";
            })();

            const Icon = isUser ? User : Bot;

            return (
              <div key={message.id} className={`flex ${alignment}`}>
                <div className={`max-w-xl px-4 py-3 rounded-lg shadow-sm ${bubbleClasses}`}>
                  <div className="flex items-start gap-2">
                    {!isSystem ? <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" /> : null}
                    <div className="text-sm w-full space-y-3">
                      <p className={message.script ? "font-semibold text-indigo-900" : "whitespace-pre-line"}>
                        {message.content}
                      </p>

                      {message.script ? (
                        <div className="space-y-4 text-sm leading-relaxed">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">
                              Introduction
                            </h4>
                            <p className="text-indigo-900 whitespace-pre-line bg-white/60 rounded-md px-3 py-2 border border-indigo-100">
                              {message.script.introduction}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">
                              Interview Questions
                            </h4>
                            <ol className="space-y-3 list-decimal list-inside text-indigo-900">
                              {message.script.questions.map((question, index) => (
                                <li key={`${question.question}-${index}`}>
                                  <p className="font-medium">{question.question}</p>
                                  {question.intent ? (
                                    <p className="text-xs text-indigo-700 mt-1">Intent: {question.intent}</p>
                                  ) : null}
                                </li>
                              ))}
                            </ol>
                          </div>

                          {message.script.closing ? (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">
                                Closing
                              </h4>
                              <p className="text-indigo-900 whitespace-pre-line bg-white/60 rounded-md px-3 py-2 border border-indigo-100">
                                {message.script.closing}
                              </p>
                            </div>
                          ) : null}

                          {message.script.reminders?.length ? (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">
                                Interviewer Reminders
                              </h4>
                              <ul className="list-disc list-inside text-indigo-900 space-y-1">
                                {message.script.reminders.map((reminder, index) => (
                                  <li key={`${reminder}-${index}`}>{reminder}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {message.timestamp ? (
                    <p className="text-xs opacity-70 mt-2 text-right">{renderTimestamp(message.timestamp)}</p>
                  ) : null}
                </div>
              </div>
            );
          })}

          {isSending ? (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bot className="w-4 h-4" />
                  <span className="text-sm">Thinking&hellip;</span>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={script ? "Add any final notes or follow-ups..." : "Type your response..."}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!isConversationReady || isSending || isStarting}
            />
            <button
              type="submit"
              disabled={!input.trim() || !isConversationReady || isSending || isStarting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>

          {combinedError ? (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {combinedError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
