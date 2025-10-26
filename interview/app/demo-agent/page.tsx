// app/demo-agent/page.tsx
// Demo page for the new LiveKit BP Agent

"use client";

import { useState } from "react";
import { Bot, Settings, Play } from "lucide-react";
import ClientLiveKitAgent from "../components/ClientLiveKitAgent";

export default function DemoAgentPage() {
  const [roomName, setRoomName] = useState("demo-room-123");
  const [agentIdentity, setAgentIdentity] = useState("demo-agent");
  const [researchGoal, setResearchGoal] = useState("Understand user preferences for mobile apps");
  const [showDemo, setShowDemo] = useState(false);

  const handleStartDemo = () => {
    setShowDemo(true);
  };

  const handleStopDemo = () => {
    setShowDemo(false);
  };

  if (showDemo) {
    return (
      <ClientLiveKitAgent
        roomName={roomName}
        agentIdentity={agentIdentity}
        researchGoal={researchGoal}
        onDisconnect={handleStopDemo}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Bot className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            LiveKit BP Agent Demo
          </h1>
          <p className="text-gray-600">
            Experience the new Beyond Presence LiveKit agent integration
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Enter room name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Identity
            </label>
            <input
              type="text"
              value={agentIdentity}
              onChange={(e) => setAgentIdentity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Enter agent identity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Research Goal
            </label>
            <textarea
              value={researchGoal}
              onChange={(e) => setResearchGoal(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Enter research goal"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              What you'll experience:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• AI agent creation and initialization</li>
              <li>• Real-time conversation with Beyond Presence avatar</li>
              <li>• LiveKit WebRTC integration</li>
              <li>• Agent status monitoring</li>
              <li>• Event-driven communication</li>
            </ul>
          </div>

          <button
            onClick={handleStartDemo}
            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Agent Demo
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Technical Details</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Agent Service:</strong> LiveKitBPAgentService</p>
            <p><strong>API Endpoint:</strong> /api/livekit-agent</p>
            <p><strong>React Hook:</strong> useLiveKitBPAgent</p>
            <p><strong>Integration:</strong> Beyond Presence + LiveKit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
