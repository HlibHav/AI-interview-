import argparse
import os
import sys
import json
import asyncio
from typing import Any, Dict, List
from datetime import datetime

from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    RoomOutputOptions,
    WorkerOptions,
    WorkerType,
    cli,
    function_tool,
    RunContext,
)
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import bey, openai
from weaviate_storage import weaviate_storage


class UserResearchAgent(Agent):
    """AI agent specialized in conducting user research interviews."""
    
    def __init__(self, research_goal: str = None):
        instructions = f"""
        You are a professional user research interviewer conducting a qualitative research session. 
        Your goal is to understand user behavior, validate product ideas, assess product-market fit, and explore potential new features.
        
        Research Goal: {research_goal or "General user research and product validation"}
        
        Guidelines:
        1. Be warm, professional, and encouraging
        2. Ask open-ended questions to understand user motivations and pain points
        3. Use follow-up questions to dig deeper into interesting responses
        4. Avoid leading questions - let users express their genuine thoughts
        5. Take notes on key insights and patterns
        6. Be empathetic and make users feel comfortable sharing
        7. Focus on understanding the "why" behind user behaviors
        8. If discussing specific features, ask about current solutions and alternatives
        
        Start by introducing yourself and explaining the purpose of the research session.
        """
        super().__init__(instructions=instructions)
    
    @function_tool()
    async def record_insight(self, context: RunContext, insight: str, category: str = "general") -> Dict[str, Any]:
        """Record a key insight from the user research session.
        
        Args:
            insight: The key insight or finding from the user
            category: Category of insight (e.g., 'pain_point', 'motivation', 'feature_request', 'behavior_pattern')
        """
        timestamp = datetime.now().isoformat()
        insight_data = {
            "insight": insight,
            "category": category,
            "timestamp": timestamp,
            "session_id": context.room.name if context.room else "unknown"
        }
        
        # Store in Weaviate (you can implement this based on your Weaviate setup)
        await self._store_insight(insight_data)
        
        return {"status": "recorded", "insight": insight}
    
    @function_tool()
    async def ask_follow_up(self, context: RunContext, topic: str, question: str) -> Dict[str, Any]:
        """Ask a follow-up question to dig deeper into a topic.
        
        Args:
            topic: The topic to explore further
            question: The specific follow-up question to ask
        """
        return {
            "action": "ask_follow_up",
            "topic": topic,
            "question": question,
            "timestamp": datetime.now().isoformat()
        }
    
    @function_tool()
    async def summarize_session(self, context: RunContext, key_findings: List[str]) -> Dict[str, Any]:
        """Summarize the key findings from the research session.
        
        Args:
            key_findings: List of key findings from the session
        """
        summary = {
            "session_id": context.room.name if context.room else "unknown",
            "timestamp": datetime.now().isoformat(),
            "key_findings": key_findings,
            "summary": " | ".join(key_findings)
        }
        
        await self._store_summary(summary)
        
        return {"status": "summarized", "findings_count": len(key_findings)}
    
    async def _store_insight(self, insight_data: Dict[str, Any]) -> None:
        """Store insight in Weaviate database."""
        await weaviate_storage.store_insight(insight_data)
    
    async def _store_summary(self, summary_data: Dict[str, Any]) -> None:
        """Store session summary in Weaviate database."""
        await weaviate_storage.store_session_summary(summary_data)


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Get research goal from room metadata or environment
    research_goal = os.environ.get("RESEARCH_GOAL", "General user research and product validation")
    
    # Validate required environment variables
    if not os.environ.get("BEY_API_KEY"):
        raise ValueError("BEY_API_KEY environment variable is required")
    
    if not os.environ.get("BEY_AVATAR_ID"):
        raise ValueError("BEY_AVATAR_ID environment variable is required")
    
    voice_agent_session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            # Use a voice that matches your avatar
            # Ref: https://platform.openai.com/docs/guides/text-to-speech#voice-options
            voice="alloy",  # Uncomment and configure voice
        ),
        
        # Enable TTS for better conversation flow
        # Note: STT is handled by the realtime model, so we don't need separate STT
        tts=openai.TTS(model="tts-1", voice="alloy", speed=1.1),
    )

    # Create the user research agent
    voice_agent = UserResearchAgent(research_goal=research_goal)

    # Initialize Beyond Presence avatar with proper configuration
    bey_avatar_session = bey.AvatarSession(
        avatar_id=os.environ["BEY_AVATAR_ID"],
        avatar_participant_identity="bey-avatar-agent",  # Default identity
        avatar_participant_name="Research Assistant"    # Custom name for the avatar
    )

    # Start the Beyond Presence avatar first (recommended order)
    await bey_avatar_session.start(voice_agent_session, room=ctx.room)

    # Start the voice agent session
    await voice_agent_session.start(agent=voice_agent, room=ctx.room)


if __name__ == "__main__":
    load_dotenv()

    sys.argv = [sys.argv[0], "dev"]  # overwrite args for the LiveKit CLI
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
        )
    )