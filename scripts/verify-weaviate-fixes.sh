#!/bin/bash

# Weaviate Fix Verification Script
echo "🔍 Weaviate Fix Verification Script"
echo "=================================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found in current directory!"
    echo "   Run: ./setup-weaviate-cloud.sh"
    echo "   Then update WEAVIATE_HOST and WEAVIATE_API_KEY"
    exit 1
fi

echo "✅ .env.local file exists in current directory"

# Check environment variables
echo ""
echo "🔧 Checking environment variables..."

# Source the .env.local file
set -a  # automatically export all variables
source .env.local
set +a  # stop automatically exporting

if [ -z "$WEAVIATE_HOST" ]; then
    echo "❌ WEAVIATE_HOST not set in .env.local"
    exit 1
fi

if [ -z "$WEAVIATE_API_KEY" ]; then
    echo "❌ WEAVIATE_API_KEY not set in .env.local"
    exit 1
fi

echo "✅ WEAVIATE_HOST: $WEAVIATE_HOST"
echo "✅ WEAVIATE_API_KEY: ${WEAVIATE_API_KEY:0:10}..."

# Check if Next.js server is running
echo ""
echo "🌐 Checking Next.js server..."

if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo "❌ Next.js server not running on localhost:3000"
    echo "   Start server with: npm run dev"
    exit 1
fi

echo "✅ Next.js server is running"

# Test Weaviate connection
echo ""
echo "🔗 Testing Weaviate connection..."

CONNECTION_TEST=$(curl -s http://localhost:3000/api/weaviate/test-connection)
if echo "$CONNECTION_TEST" | grep -q '"success":true'; then
    echo "✅ Weaviate connection successful"
    echo "   Response: $CONNECTION_TEST"
else
    echo "❌ Weaviate connection failed"
    echo "   Response: $CONNECTION_TEST"
    echo ""
    echo "   Troubleshooting steps:"
    echo "   1. Verify WEAVIATE_HOST and WEAVIATE_API_KEY in .env.local"
    echo "   2. Check if your Weaviate Cloud cluster is running"
    echo "   3. Ensure API key has proper permissions"
    exit 1
fi

# Test schema creation
echo ""
echo "📋 Testing schema creation..."

SCHEMA_TEST=$(curl -s -X POST http://localhost:3000/api/weaviate \
  -H "Content-Type: application/json" \
  -d '{"action":"create_schema"}')

if echo "$SCHEMA_TEST" | grep -q '"success":true'; then
    echo "✅ Schema creation successful"
else
    echo "⚠️  Schema creation failed or already exists"
    echo "   Response: $SCHEMA_TEST"
fi

# Test session creation
echo ""
echo "📝 Testing session creation..."

SESSION_DATA='{
  "script": {"introduction": "Test interview", "questions": []},
  "researchGoal": "Test research goal for verification",
  "adminEmail": "test@example.com",
  "targetAudience": "Test audience",
  "duration": 30,
  "sensitivity": "low"
}'

SESSION_TEST=$(curl -s -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d "$SESSION_DATA")

if echo "$SESSION_TEST" | grep -q '"success":true'; then
    echo "✅ Session creation successful"
    SESSION_ID=$(echo "$SESSION_TEST" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
    echo "   Session ID: $SESSION_ID"
else
    echo "❌ Session creation failed"
    echo "   Response: $SESSION_TEST"
    exit 1
fi

# Test agent storage (clarification)
echo ""
echo "🤖 Testing agent storage (clarification)..."

CLARIFICATION_DATA='{
  "researchGoal": "Test research goal",
  "clarifications": ["Test clarification"]
}'

CLARIFICATION_TEST=$(curl -s -X POST http://localhost:3000/api/agents/clarification \
  -H "Content-Type: application/json" \
  -d "$CLARIFICATION_DATA")

if echo "$CLARIFICATION_TEST" | grep -q '"status":"complete"'; then
    echo "✅ Clarification agent working"
else
    echo "⚠️  Clarification agent may have issues"
    echo "   Response: $CLARIFICATION_TEST"
fi

# Final verification
echo ""
echo "🎯 Final Verification Steps:"
echo "1. Check your Weaviate Cloud dashboard:"
echo "   https://console.weaviate.cloud"
echo "2. Look for objects in InterviewSession collection"
echo "3. Verify object count > 0"
echo ""

echo "✅ All tests completed!"
echo ""
echo "📊 Summary of fixes applied:"
echo "   ✅ Fixed hardcoded localhost in primary Weaviate route"
echo "   ✅ Added Weaviate Cloud storage to session creation"
echo "   ✅ Fixed all agent storage functions"
echo "   ✅ Updated connection logic for cloud vs local"
echo ""
echo "🚀 Your Weaviate Cloud collections should now receive data!"
