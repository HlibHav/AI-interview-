#!/usr/bin/env python3
"""
Test script to verify the LiveKit agent setup with Beyond Presence integration.
Run this to check if all dependencies are properly installed.
"""

import os
import sys
from dotenv import load_dotenv

def test_imports():
    """Test if all required imports work correctly."""
    try:
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
        print("✅ All imports successful!")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_environment():
    """Test if required environment variables are set."""
    load_dotenv()
    
    required_vars = [
        "BEY_API_KEY",
        "BEY_AVATAR_ID",
        "OPENAI_API_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set these in your .env file")
        return False
    else:
        print("✅ All required environment variables are set!")
        return True

def test_beyond_presence_config():
    """Test Beyond Presence configuration."""
    try:
        from livekit.plugins import bey
        
        # Test creating an AvatarSession (without actually starting it)
        avatar_id = os.environ.get("BEY_AVATAR_ID", "test-avatar-id")
        bey_avatar_session = bey.AvatarSession(
            avatar_id=avatar_id,
            avatar_participant_identity="bey-avatar-agent",
            avatar_participant_name="Research Assistant"
        )
        print("✅ Beyond Presence configuration successful!")
        return True
    except Exception as e:
        print(f"❌ Beyond Presence configuration error: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Testing LiveKit Agent Setup with Beyond Presence...")
    print("=" * 60)
    
    tests = [
        ("Import Test", test_imports),
        ("Environment Test", test_environment),
        ("Beyond Presence Config Test", test_beyond_presence_config),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 {test_name}:")
        if test_func():
            passed += 1
        else:
            print(f"   Please fix the issues above before running the agent.")
    
    print("\n" + "=" * 60)
    if passed == total:
        print(f"🎉 All tests passed! ({passed}/{total})")
        print("Your LiveKit agent with Beyond Presence is ready to run!")
    else:
        print(f"⚠️  {passed}/{total} tests passed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()