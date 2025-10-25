"use client";

import { useState } from "react";
import { Bot, User, ArrowRight, Mic, Video, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function InterviewLanding() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 bg-opacity-50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="w-8 h-8 text-blue-400" />
              <h1 className="text-xl font-bold text-white">AI Research Interviews</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How it Works</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            AI-Powered User Research
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Conduct professional user research interviews with AI assistants instead of human researchers. 
            Get instant insights, natural conversations, and scalable research capabilities.
          </p>
          
          {/* CTA Button */}
          <Link href="/direct-interview">
            <button
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Start AI Interview
              <ArrowRight className={`ml-2 w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </button>
          </Link>
          
          <p className="text-sm text-gray-400 mt-4">
            No registration required • Instant access • Professional AI interviewer
          </p>
        </div>

        {/* Features Grid */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <Bot className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">AI Interviewer</h3>
            <p className="text-gray-300">
              Professional AI assistant conducts natural, engaging interviews using advanced language models and visual avatars.
            </p>
          </div>
          
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <Mic className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Real-time Audio</h3>
            <p className="text-gray-300">
              High-quality voice interaction with real-time speech recognition and natural conversation flow.
            </p>
          </div>
          
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <Video className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Visual Presence</h3>
            <p className="text-gray-300">
              Beyond Presence avatars provide engaging visual interaction for a more natural interview experience.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div id="how-it-works" className="bg-gray-800 bg-opacity-30 backdrop-blur-sm rounded-lg p-8 border border-gray-700">
          <h2 className="text-3xl font-bold text-white text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Click Start</h3>
              <p className="text-gray-300 text-sm">No registration needed. Just click and start your interview.</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Grant Permissions</h3>
              <p className="text-gray-300 text-sm">Allow camera and microphone access for the interview.</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Interview</h3>
              <p className="text-gray-300 text-sm">Have a natural conversation with our AI interviewer.</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Get Insights</h3>
              <p className="text-gray-300 text-sm">Receive instant insights and research findings.</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Why Choose AI Interviews?</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="text-xl font-semibold text-white mb-4">For Researchers</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Scale research without hiring more interviewers</li>
                <li>• Consistent interview quality every time</li>
                <li>• 24/7 availability for global participants</li>
                <li>• Automatic insight extraction and analysis</li>
                <li>• Reduced bias and standardized questions</li>
              </ul>
            </div>
            
            <div className="text-left">
              <h3 className="text-xl font-semibold text-white mb-4">For Participants</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• No scheduling conflicts or waiting</li>
                <li>• Comfortable, judgment-free environment</li>
                <li>• Flexible timing - interview when convenient</li>
                <li>• Professional, engaging experience</li>
                <li>• Your feedback directly impacts products</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-16 text-center">
          <Link href="/direct-interview">
            <button className="inline-flex items-center px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
              <MessageCircle className="w-5 h-5 mr-2" />
              Start Your Interview Now
            </button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 bg-opacity-50 backdrop-blur-sm border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 AI Research Interviews. Powered by LiveKit and Beyond Presence.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}