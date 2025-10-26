"use client";

import React from 'react';

export default function TestEmbedPage() {
  const agentId = "fc8bd7ef-9bc8-4fb7-bb1f-41f92a70f9db";
  const embedUrl = `https://bey.chat/${agentId}`;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Agent Embed</h1>
        
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Agent Details</h2>
          <p><strong>Agent ID:</strong> {agentId}</p>
          <p><strong>Embed URL:</strong> {embedUrl}</p>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Embedded Agent</h2>
          <iframe 
            src={embedUrl}
            width="100%" 
            height="600px"
            frameBorder="0"
            allowFullScreen
            allow="camera; microphone; fullscreen"
            style={{ border: 'none', maxWidth: '100%' }}
            title="Beyond Presence Agent"
          />
        </div>

        <div className="mt-4 p-4 bg-blue-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Instructions</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>If you see a sign-up page, the agent may need to be activated</li>
            <li>If you see an error, check the browser console for details</li>
            <li>Make sure to allow camera and microphone permissions</li>
            <li>The agent should appear as an interactive avatar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
