import Link from "next/link";
import { Mic, Users, BarChart3, Brain } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI Interview Assistant
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Conduct qualitative user research interviews without human moderators. 
            Our AI agent asks open questions, listens attentively, and generates 
            actionable insights with psychological profiling.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Admin Dashboard */}
          <Link 
            href="/admin"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 hover:border-blue-300"
          >
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Create research goals, generate interview scripts, and analyze results. 
              Perfect for product teams conducting market validation studies.
            </p>
            <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
              Access Dashboard
              <svg className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Respondent Interface */}
          <Link 
            href="/respondent"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 hover:border-green-300"
          >
            <div className="flex items-center mb-4">
              <Mic className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">Interview Session</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Participate in AI-led interviews with voice and video support. 
              Share your experiences and help shape better products.
            </p>
            <div className="flex items-center text-green-600 font-medium group-hover:text-green-700">
              Start Interview
              <svg className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Key Features
          </h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Interviewing</h4>
              <p className="text-gray-600">
                Advanced AI agents conduct natural conversations, ask follow-up questions, 
                and adapt to participant responses in real-time.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Psychological Profiling</h4>
              <p className="text-gray-600">
                Generate Big Five personality traits and Enneagram types from 
                conversation analysis with detailed radar charts.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Real-time Analysis</h4>
              <p className="text-gray-600">
                Live transcription, summarization, and sentiment analysis with 
                comprehensive reporting and insights generation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
