# AI Interview Assistant

A full-stack Next.js application for conducting AI-powered user research interviews. This system enables product teams to run qualitative interviews without human moderators, featuring real-time transcription, psychological profiling, and comprehensive analytics.

## Features

- **AI-Powered Interviewing**: Advanced AI agents conduct natural conversations with follow-up questions
- **Real-time Analysis**: Live transcription, summarization, and sentiment analysis
- **Psychological Profiling**: Big Five personality traits and Enneagram type analysis
- **Comprehensive Analytics**: Detailed insights with radar charts and trait distribution
- **Secure Data Handling**: GDPR-compliant data processing and anonymization
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **AI/ML**: OpenAI GPT-4, LangChain
- **Vector Database**: Weaviate
- **Observability**: Phoenix (optional)
- **Charts**: Recharts
- **UI Components**: Radix UI

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- OpenAI API key

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
   # Edit .env.local with your API keys
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
5. **Analyze Results**: View transcripts, summaries, and psychological profiles

### For Participants (Respondent Interface)

1. **Join Session**: Click the interview link provided by researchers
2. **Grant Permissions**: Allow microphone and camera access
3. **Conduct Interview**: Have a natural conversation with the AI interviewer
4. **Complete Session**: Review and confirm your participation

## API Endpoints

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
- **Respondent Interface**: Interview session with audio/video support
- **Analytics Dashboard**: Comprehensive insights and psychological profiling

### Backend Services
- **Agent Orchestration**: Multi-agent system for different interview phases
- **Vector Storage**: Weaviate integration for RAG and memory
- **Session Management**: Real-time interview state tracking
- **Data Processing**: Transcription, summarization, and analysis

### AI Agents

1. **Clarification Agent**: Asks follow-up questions to refine research goals
2. **Planner Agent**: Generates structured interview scripts
3. **Interviewer Agent**: Conducts live conversations with participants
4. **Summarizer Agent**: Compresses responses into key insights
5. **Psychometric Agent**: Analyzes personality traits and psychological profiles

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
WEAVIATE_HOST=localhost:8080

# Optional
PHOENIX_API_KEY=your_phoenix_key
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006
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
│   ├── admin/                 # Admin dashboard pages
│   ├── respondent/           # Participant interface
│   ├── api/                  # Backend API routes
│   │   ├── agents/          # AI agent endpoints
│   │   ├── sessions/        # Session management
│   │   └── weaviate/        # Vector database
│   ├── components/          # Reusable UI components
│   └── lib/                 # Utility functions
├── public/                  # Static assets
└── README.md
```

### Adding New Features

1. **New Agent**: Create endpoint in `app/api/agents/`
2. **UI Component**: Add to `app/components/ui/`
3. **Page Route**: Create in appropriate `app/` directory
4. **API Integration**: Update client-side code with new endpoints

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

## Roadmap

- [ ] Real-time audio/video streaming integration
- [ ] Advanced psychometric analysis
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Enterprise features
- [ ] API rate limiting and monitoring