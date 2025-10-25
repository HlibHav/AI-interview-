#!/usr/bin/env python3
"""
Simple test script to verify the LiveKit agent setup
"""

import os
import sys
from dotenv import load_dotenv

def test_environment():
    """Test if all required environment variables are set."""
    load_dotenv()
    
    required_vars = [
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY", 
        "LIVEKIT_API_SECRET",
        "OPENAI_API_KEY",
        "BEY_AVATAR_ID"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease update your .env file with the missing variables.")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

def test_imports():
    """Test if all required modules can be imported."""
    try:
        from livekit.agents import JobContext, WorkerOptions, WorkerType, cli
        from livekit.agents.voice import Agent, AgentSession
        from livekit.plugins import bey, openai
        from weaviate_storage import weaviate_storage
        print("✅ All required modules imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Please ensure all dependencies are installed:")
        print("pip install -r requirements.txt")
        return False

def test_weaviate_connection():
    """Test Weaviate connection."""
    try:
        from weaviate_storage import weaviate_storage
        if weaviate_storage.client:
            print("✅ Weaviate connection successful")
            return True
        else:
            print("⚠️  Weaviate client not available (will use fallback logging)")
            return True
    except Exception as e:
        print(f"⚠️  Weaviate connection issue: {e}")
        print("The agent will still work but insights won't be stored in Weaviate")
        return True

def main():
    """Run all tests."""
    print("🧪 Testing LiveKit AI Interview Agent Setup\n")
    
    tests = [
        ("Environment Variables", test_environment),
        ("Module Imports", test_imports),
        ("Weaviate Connection", test_weaviate_connection),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"Testing {test_name}...")
        result = test_func()
        results.append(result)
        print()
    
    if all(results):
        print("🎉 All tests passed! The agent is ready to run.")
        print("\nTo start the agent:")
        print("  ./start_agent.sh")
        print("\nOr manually:")
        print("  python3 main.py")
    else:
        print("❌ Some tests failed. Please fix the issues above before running the agent.")
        sys.exit(1)

if __name__ == "__main__":
    main()
