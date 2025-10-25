"use client";

import { useState } from "react";
import { Users, Copy, ExternalLink, Clock, CheckCircle, XCircle, Play } from "lucide-react";

interface Session {
  id: string;
  status: "pending" | "in-progress" | "completed";
  createdAt: string;
  participantEmail?: string;
  duration?: number;
  transcriptUrl?: string;
}

export default function SessionList() {
  const [sessions] = useState<Session[]>([
    {
      id: "session-001",
      status: "pending",
      createdAt: "2024-01-15T10:30:00Z",
    },
    {
      id: "session-002", 
      status: "in-progress",
      createdAt: "2024-01-15T11:00:00Z",
      participantEmail: "john.doe@example.com",
      duration: 15,
    },
    {
      id: "session-003",
      status: "completed",
      createdAt: "2024-01-15T09:00:00Z",
      participantEmail: "jane.smith@example.com",
      duration: 28,
      transcriptUrl: "/transcripts/session-003",
    }
  ]);

  const getStatusIcon = (status: Session["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "in-progress":
        return <Play className="w-4 h-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusText = (status: Session["status"]) => {
    switch (status) {
      case "pending":
        return "Waiting for participant";
      case "in-progress":
        return "Interview in progress";
      case "completed":
        return "Interview completed";
    }
  };

  const copySessionLink = (sessionId: string) => {
    const link = `${window.location.origin}/interviewee?session=${sessionId}`;
    navigator.clipboard.writeText(link);
    // You could add a toast notification here
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Sessions</h2>
        <p className="text-gray-600">
          Manage and monitor your interview sessions. Share links with participants to start interviews.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {session.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(session.status)}
                      <span className="ml-2 text-sm text-gray-900">
                        {getStatusText(session.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {session.participantEmail || "Not joined yet"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {session.duration ? `${session.duration} min` : "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(session.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => copySessionLink(session.id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Copy session link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {session.status === "completed" && session.transcriptUrl && (
                        <button
                          onClick={() => window.open(session.transcriptUrl, '_blank')}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="View transcript"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Link Generator */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Generate New Session Link</h3>
        <p className="text-blue-700 mb-4">
          Create a new interview session and share the link with participants.
        </p>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Users className="w-4 h-4 mr-2" />
          Generate Session Link
        </button>
      </div>
    </div>
  );
}
