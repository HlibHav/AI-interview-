#!/bin/bash

# LiveKit User Research Agent Startup Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting LiveKit User Research Agent...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please create a .env file with the following variables:${NC}"
    echo "LIVEKIT_URL=wss://your-livekit-server.com"
    echo "LIVEKIT_API_KEY=your-api-key"
    echo "LIVEKIT_API_SECRET=your-api-secret"
    echo "OPENAI_API_KEY=your-openai-api-key"
    echo "BEY_AVATAR_ID=your-bey-avatar-id"
    echo "WEAVIATE_URL=http://localhost:8080"
    echo "WEAVIATE_API_KEY=your-weaviate-api-key"
    echo "RESEARCH_GOAL=Your research goal description"
    exit 1
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source myenv/bin/activate

# Install/update dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt

# Start the agent
echo -e "${GREEN}Starting the agent...${NC}"
python3 main.py
