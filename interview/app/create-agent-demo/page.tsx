"use client";

import React, { useState } from 'react';
import SimpleBPInterviewRoom from '../components/SimpleBPInterviewRoom';

export default function CreateAgentDemoPage() {
  const [sessionId] = useState(() => `demo-${Date.now()}`);
  const [researchGoal] = useState('User experience with mobile apps');
  
  const handleDisconnect = () => {
    console.log('Disconnected from interview');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <SimpleBPInterviewRoom
        sessionId={sessionId}
        participantEmail="demo@example.com"
        researchGoal={researchGoal}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}
