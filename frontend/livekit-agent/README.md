# LiveKit AI Interview Agent

This LiveKit agent conducts user research interviews using Beyond Presence avatars instead of human product managers.

## Features

- **AI-Powered Interviews**: Uses OpenAI's GPT-4o for natural conversation
- **Beyond Presence Integration**: Visual avatar for engaging user experience
- **Weaviate Storage**: Stores interview insights and session data
- **Real-time Audio/Video**: Full LiveKit integration for seamless communication
- **Research Tools**: Built-in functions for recording insights and follow-up questions

## Setup

### 1. Environment Configuration

Create a `.env` file in the `livekit-agent` directory:

```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Beyond Presence Configuration
BEY_AVATAR_ID=your-bey-avatar-id

# Weaviate Configuration (for storing interview data)
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=your-weaviate-api-key

# Research Configuration
RESEARCH_GOAL=Your research goal description
```

### 2. Install Dependencies

```bash
# Activate virtual environment
source /Users/rachelyong/AI-interview-/frontend/path/to/venv/bin/activate

# Install Python dependencies
cd livekit-agent
pip install -r requirements.txt
```

### 3. Start the Agent

```bash
# Using the startup script
./start_agent.sh

# Or manually
python3 main.py
```

## Usage

### Starting an Interview Session

1. **Frontend Integration**: Use the `/ai-interview` page with session parameters:
   ```
   /ai-interview?session=session-id&goal=research-goal
   ```

2. **API Endpoint**: Call the start session API:
   ```javascript
   const response = await fetch('/api/interview-session/start', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       sessionId: 'unique-session-id',
       participantEmail: 'user@example.com',
       researchGoal: 'Understanding user preferences for feature X'
     })
   });
   ```

### Agent Capabilities

The AI agent includes specialized tools for user research:

- **`record_insight`**: Captures key findings during the interview
- **`ask_follow_up`**: Asks targeted follow-up questions
- **`summarize_session`**: Creates session summaries with key findings

### Research Focus Areas

The agent is optimized for:
- User behavior understanding
- Product-market fit validation
- Feature preference research
- Pain point identification
- Motivation analysis

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   LiveKit        │    │   AI Agent      │
│   (Next.js)     │◄──►│   Server         │◄──►│   (Python)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Beyond        │    │   OpenAI         │    │   Weaviate      │
│   Presence      │    │   (GPT-4o)      │    │   (Storage)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Development

### Testing the Agent

1. Start the LiveKit agent
2. Open the frontend at `/ai-interview?session=test-session`
3. Grant camera/microphone permissions
4. Enter your email (optional)
5. Click "Start AI Interview"

### Customizing Research Questions

Modify the `UserResearchAgent` class in `main.py` to customize:
- Interview instructions
- Research focus areas
- Question patterns
- Follow-up strategies

### Adding New Tools

Extend the agent with additional research tools:

```python
@function_tool()
async def your_custom_tool(self, context: RunContext, param: str) -> Dict[str, Any]:
    """Your custom research tool."""
    # Implementation here
    return {"result": "success"}
```

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check LiveKit server URL and credentials
2. **Avatar Not Loading**: Verify Beyond Presence avatar ID
3. **Audio Issues**: Ensure microphone permissions are granted
4. **Storage Errors**: Check Weaviate connection and API key

### Logs

The agent provides detailed logging for debugging:
- Connection status
- Interview insights
- Error messages
- Session summaries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the AI Interview system for user research.
