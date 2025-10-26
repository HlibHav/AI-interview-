# AI Interview Assistant

A full-stack Next.js application for conducting AI-powered user research interviews using Beyond Presence avatars. This system enables product teams to run qualitative interviews with realistic AI avatars that can see, hear, and interact naturally with participants through real-time video conversations.

## Features

- **AI Avatar Interviews**: Realistic AI avatars conduct natural video conversations with participants
- **Beyond Presence Integration**: Powered by Beyond Presence's advanced avatar technology
- **Real-time Video/Audio**: Live camera and microphone interaction with AI avatars
- **Research Goal Customization**: AI agents tailored to specific research objectives
- **Session Management**: Complete interview session tracking and management
- **Secure Data Handling**: GDPR-compliant data processing and anonymization
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **AI Avatars**: Beyond Presence API and SDK
- **AI/ML**: OpenAI GPT-4 for script generation and clarification
- **Vector Database**: Weaviate (for research goals and question plans)
- **UI Components**: Radix UI, Lucide React icons
- **Deployment**: Docker, Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- OpenAI API key
- Beyond Presence API key and Avatar ID

### Quick Start (Recommended)

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd interview
   chmod +x setup.sh
   ./setup.sh
   ```

   This will automatically:
   - Install all dependencies
   - Set up environment variables
   - Start Weaviate vector database
   - Launch the Next.js application
   - Run health checks

### Manual Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key
- Weaviate instance (local or cloud)

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd interview
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp env.example .env.local
   # Edit .env.local with your API keys:
   # - OPENAI_API_KEY: Your OpenAI API key
   # - BEY_API_KEY: Your Beyond Presence API key
   # - BEY_AVATAR_ID: Your Beyond Presence Avatar ID
   ```

3. **Start Weaviate** (using Docker):
   ```bash
   docker run -p 8080:8080 -e QUERY_DEFAULTS_LIMIT=20 \
     -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
     semitechnologies/weaviate:1.24.0
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## Usage

### For Researchers (Admin Dashboard)

1. **Define Research Goal**: Enter your research objective and target audience
2. **Clarification Chat**: Answer AI agent questions to refine your research scope
3. **Review Script**: Edit and approve the generated interview questions
4. **Share Link**: Distribute the interview link to participants
5. **Monitor Sessions**: Track interview progress and completion

### For Participants (Respondent Interface)

1. **Join Session**: Click the interview link provided by researchers
2. **Grant Permissions**: Allow microphone and camera access for avatar interaction
3. **Conduct Interview**: Have a natural video conversation with the AI avatar
4. **Complete Session**: Review and confirm your participation

### Avatar Interaction

The AI avatar can:
- **See participants** through their webcam
- **Hear participants** through their microphone
- **Respond naturally** with realistic facial expressions and gestures
- **Ask follow-up questions** based on participant responses
- **Adapt conversation flow** according to research goals

## API Endpoints

### Beyond Presence Integration
- `POST /api/beyond-presence/create-agent` - Create AI avatar agent
- `GET /api/beyond-presence/get-agent` - Retrieve agent details
- `POST /api/beyond-presence/create-session` - Create interview session
- `GET /api/beyond-presence/session-status` - Check session status

### Agent Endpoints
- `POST /api/agents/clarification` - Clarification agent for research goals
- `POST /api/agents/planner` - Interview script generation
- `POST /api/agents/interviewer` - Live interview management
- `POST /api/agents/summarizer` - Response summarization
- `POST /api/agents/psychometric` - Personality profiling

### Session Management
- `POST /api/sessions` - Create new interview session
- `GET /api/sessions` - Retrieve session data
- `PUT /api/sessions` - Update session information

### Data Storage
- `POST /api/weaviate` - Store and retrieve vector data

## Architecture

### Frontend Components
- **Admin Dashboard**: Research goal input, script editor, session management
- **Respondent Interface**: Video interview session with AI avatar
- **SimpleBPInterviewRoom**: Main interview component with avatar embedding
- **Test Pages**: Development and testing interfaces

### Backend Services
- **Beyond Presence Integration**: Avatar creation and session management
- **Agent Orchestration**: Multi-agent system for different interview phases
- **Vector Storage**: Weaviate integration for RAG and memory
- **Session Management**: Real-time interview state tracking
- **CORS Handling**: Server-side API routes to avoid browser CORS issues

### AI Agents

1. **Clarification Agent**: Asks follow-up questions to refine research goals
2. **Planner Agent**: Generates structured interview scripts
3. **Beyond Presence Avatar**: Conducts live video conversations with participants
4. **Summarizer Agent**: Compresses responses into key insights
5. **Psychometric Agent**: Analyzes personality traits and psychological profiles

### Beyond Presence Integration

The system uses Beyond Presence's Create Agent API to:
- **Create AI avatars** with custom system prompts and greetings
- **Embed avatars** in iframe components for seamless integration
- **Handle real-time communication** through Beyond Presence's infrastructure
- **Manage sessions** with automatic cleanup and status tracking

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
BEY_API_KEY=your_beyond_presence_api_key
BEY_AVATAR_ID=your_beyond_presence_avatar_id

# Optional
BEY_API_URL=https://api.bey.dev
WEAVIATE_HOST=localhost:8080
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Weaviate Schema

The application automatically creates the following schema classes:
- `ResearchGoal` - Research objectives and parameters
- `QuestionPlan` - Interview scripts and questions
- `InterviewChunk` - Transcript segments with metadata
- `PsychProfile` - Psychological trait analysis

## Development

### Project Structure
```
interview/
├── app/
│   ├── admin/                    # Admin dashboard pages
│   ├── respondent/              # Participant interface
│   ├── create-agent-demo/       # Demo page for Create Agent approach
│   ├── test-embed/             # Test page for avatar embedding
│   ├── api/                    # Backend API routes
│   │   ├── agents/             # AI agent endpoints
│   │   ├── beyond-presence/    # Beyond Presence integration
│   │   │   ├── create-agent/   # Create Agent API
│   │   │   ├── get-agent/      # Get agent details
│   │   │   └── create-session/ # Session management
│   │   ├── sessions/           # Session management
│   │   └── weaviate/           # Vector database
│   ├── components/             # Reusable UI components
│   │   ├── SimpleBPInterviewRoom.tsx  # Main interview component
│   │   └── ui/                 # UI components
│   └── lib/                    # Utility functions
├── public/                     # Static assets
└── README.md
```

### Adding New Features

1. **New Agent**: Create endpoint in `app/api/agents/`
2. **UI Component**: Add to `app/components/ui/`
3. **Page Route**: Create in appropriate `app/` directory
4. **Beyond Presence Integration**: Add endpoints in `app/api/beyond-presence/`
5. **API Integration**: Update client-side code with new endpoints

### Testing Avatar Integration

1. **Test Embed Page**: Visit `http://localhost:3000/test-embed` to test avatar embedding
2. **Create Agent Demo**: Visit `http://localhost:3000/create-agent-demo` for full demo
3. **Respondent Interface**: Use `http://localhost:3000/respondent?sessionId=test` for testing

## Deployment

### Docker Deployment (Recommended)

1. **Quick Production Deploy**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. **Manual Docker Setup**:
   ```bash
   # Build and start all services
   docker-compose up -d --build
   
   # Check status
   docker-compose ps
   
   # View logs
   docker-compose logs
   ```

3. **Stop Services**:
   ```bash
   # Stop all services
   docker-compose down
   
   # Stop and remove volumes
   docker-compose down -v
   ```

### Production Setup

1. **Environment Configuration**:
   - Set production environment variables
   - Configure Weaviate cloud instance
   - Set up OpenAI API access

2. **Database Setup**:
   - Initialize Weaviate schema
   - Configure vector indexing
   - Set up data retention policies

3. **Security**:
   - Enable HTTPS
   - Configure CORS policies
   - Set up authentication (if needed)

### Deployment Options

- **Docker**: Containerized deployment (recommended)
- **Vercel**: Frontend deployment with serverless functions
- **Railway**: Full-stack deployment with database
- **AWS/GCP**: Cloud infrastructure deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is provided for educational and research purposes. Please ensure compliance with data protection regulations (GDPR, CCPA) when handling participant data.

## Support

For questions or issues:
- Check the documentation
- Review the API endpoints
- Examine the example configurations
- Contact the development team

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure you're using server-side API routes (`/api/beyond-presence/create-agent`) instead of direct Beyond Presence API calls
2. **Avatar Not Loading**: Check that `BEY_API_KEY` and `BEY_AVATAR_ID` are correctly set in `.env.local`
3. **Camera/Microphone Issues**: Ensure browser permissions are granted and HTTPS is used in production
4. **Agent Creation Fails**: Verify Beyond Presence API credentials and avatar ID validity

### Development Tips

- Use the test pages (`/test-embed`, `/create-agent-demo`) for isolated testing
- Check browser console for detailed error messages
- Verify API responses in Network tab
- Clear browser cache if experiencing stale JavaScript issues

## Roadmap

- [x] Beyond Presence avatar integration
- [x] Create Agent API implementation
- [x] Real-time video/audio interaction
- [ ] Advanced psychometric analysis
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Enterprise features
- [ ] API rate limiting and monitoring