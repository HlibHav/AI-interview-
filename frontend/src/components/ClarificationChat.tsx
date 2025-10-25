"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, CheckCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ClarificationChatProps {
  researchGoal: string;
  onComplete: () => void;
}

export default function ClarificationChat({ researchGoal, onComplete }: ClarificationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with AI greeting
    const initialMessage: Message = {
      id: "1",
      role: "assistant",
      content: `Hello! I'm your AI research assistant. I've reviewed your research goal: "${researchGoal}". Let me ask a few clarifying questions to help create the perfect interview script.`,
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
  }, [researchGoal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses = [
        "That's helpful! Can you tell me more about the specific behaviors you want to observe?",
        "Great insight! What would you consider a successful outcome for this research?",
        "Interesting! Are there any particular user segments you're most interested in?",
        "Perfect! I have enough information now. Let me generate your interview script.",
      ];

      const responseIndex = Math.min(messages.length, responses.length - 1);
      const isLastResponse = responseIndex === responses.length - 1;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[responseIndex],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);

      if (isLastResponse) {
        setIsComplete(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <Bot className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Clarification Chat</h2>
        <p className="text-gray-600">
          The AI assistant will ask clarifying questions to refine your research objectives.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg h-96 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="flex items-start">
                  {message.role === "assistant" && (
                    <Bot className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  {message.role === "user" && (
                    <User className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-sm">{message.content}</p>
                </div>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center">
                  <Bot className="w-4 h-4 mr-2" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          {isComplete ? (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-600 font-medium">Clarification complete! Moving to script generation...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your response..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
