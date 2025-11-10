# AI Interview Assistant

> **Deep user insights, instantly.** An AI-powered qualitative research platform that conducts automated user interviews with psychometric profiling and real-time intelligence.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 🎯 Overview

AI Interview Assistant is a comprehensive platform that enables product teams to conduct qualitative user research interviews without human moderators. It combines multi-agent AI orchestration, psychometric profiling, and real-time analysis to deliver actionable insights faster and cheaper than traditional research methods.

### Key Value Propositions

- **90% Cost Reduction** vs. traditional interviews (no moderator fees, no scheduling overhead)
- **Minutes vs. Weeks** for insights (automated analysis vs. manual transcription)
- **Psychometric Profiling** - Unique Big Five + Enneagram personality analysis
- **Real-Time Intelligence** - Live emotion detection and adaptive questioning
- **Scalable** - Unlimited concurrent interviews vs. one-at-a-time

## 🚀 Features

### Core Capabilities

- **🤖 Multi-Agent AI System**
  - Clarification Agent: Interactive goal refinement
  - Planner Agent: Structured script generation
  - Interviewer Agent: Natural conversation flow
  - Summarizer Agent: Real-time transcript compression
  - Psychometric Agent: Big Five + Enneagram profiling
  - Follow-up Planner: Context-aware question generation

- **🧠 Advanced Analysis**
  - Real-time emotion and sentiment analysis
  - Pain-Gain-Jobs framework extraction
  - Contradiction detection
  - Theme categorization
  - Cross-session pattern recognition

- **📊 Analytics & Visualization**
  - Psychometric radar charts
  - Trait distribution analysis
  - Session analytics dashboard
  - Key insights extraction
  - Batch summary generation

- **💬 Interview Management**
  - Dynamic script generation
  - Real-time transcription (via Beyond Presence)
  - Pause/resume functionality
  - Session lifecycle management
  - Shareable interview links

- **🔍 RAG-Powered Intelligence**
  - Semantic similarity search
  - Context-aware question generation
  - Cross-session knowledge retrieval
  - Research goal matching

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS 4
- Radix UI components
- Recharts for visualization

**Backend:**
- Next.js API Routes (serverless)
- Node.js + TypeScript
- LangChain for agent orchestration

**AI & ML:**
- OpenAI GPT-4 / GPT-4o-mini
- Weaviate vector database
- OpenAI embeddings (text-embedding-ada-002)

**Integrations:**
- Beyond Presence (avatar/video)
- Phoenix (observability, optional)

### System Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Admin UI      │         │  Respondent UI  │
│   (Dashboard)   │         │   (Interview)    │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
         ┌───────────▼───────────┐
         │   Next.js API Routes   │
         │  ┌──────────────────┐  │
         │  │  Multi-Agent     │  │
         │  │  Orchestration  │  │
         │  └──────────────────┘  │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌──────▼──────┐   ┌────▼────┐
│ OpenAI │    │  Weaviate   │   │ Beyond  │
│  API   │    │   Vector DB │   │Presence │
└────────┘    └─────────────┘   └─────────┘
```

## 📁 Repository Structure

```
.
├── interview/                    # Main Next.js application
│   ├── app/                     # Next.js app directory
│   │   ├── admin/               # Admin dashboard
│   │   ├── api/                 # API routes
│   │   │   ├── agents/         # AI agent endpoints
│   │   │   ├── sessions/       # Session management
│   │   │   ├── beyond-presence/ # Avatar integration
│   │   │   └── weaviate/       # Database operations
│   │   ├── components/         # React components
│   │   └── respondent/         # Interview interface
│   ├── lib/                     # Shared utilities
│   │   ├── weaviate/          # Weaviate integration
│   │   ├── analysis/          # Analysis modules
│   │   └── agents/            # Agent logic
│   └── types/                  # TypeScript definitions
├── docs/                        # Documentation
│   ├── SYSTEM_AUDIT_AND_PRODUCT_STRATEGY.md  # Comprehensive audit
│   ├── architecture.md         # System architecture
│   ├── technical_design.md     # Technical design
│   └── ...                     # Other docs
├── scripts/                     # Setup scripts
├── config/                      # Configuration files
└── openmemory/                  # Memory system (submodule)
```

## 🎯 Use Cases

### Product Research
- Understand user needs, pain points, and behaviors
- Validate product assumptions
- Discover feature opportunities

### UX Research
- Understand user mental models
- Map user workflows
- Identify usability issues

### Market Validation
- Test product-market fit
- Understand market needs
- Identify target personas

### User Persona Development
- Build psychometric profiles
- Understand personality traits
- Segment users by behavior

## 🔧 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (for Weaviate)
- OpenAI API key
- Beyond Presence API key (optional, for video avatars)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies:**
   ```bash
   cd interview
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp ../config/env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Start Weaviate (Docker):**
   ```bash
   docker-compose -f config/docker-compose.yml up -d
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - Admin Dashboard: `http://localhost:3000/admin`
   - Respondent Interface: `http://localhost:3000/respondent`

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[System Audit & Product Strategy](docs/SYSTEM_AUDIT_AND_PRODUCT_STRATEGY.md)** - Complete system analysis, architecture review, and product positioning
- **[Architecture](docs/architecture.md)** - System architecture overview
- **[Technical Design](docs/technical_design.md)** - Technical design specifications
- **[Evaluation Plan](docs/evaluation_plan.md)** - Quality assessment methodology
- **[UI Flow](docs/ui_flow.md)** - User interface flows
- **[Agent Prompts](docs/agent_prompts.md)** - AI agent system prompts

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run api          # Start API server on port 3001
```

### API Endpoints

**Agents:**
- `POST /api/agents/clarification` - Clarify research goals
- `POST /api/agents/planner` - Generate interview scripts
- `POST /api/agents/interviewer` - Conduct interviews
- `POST /api/agents/summarizer` - Summarize transcripts
- `POST /api/agents/psychometric` - Generate psychometric profiles

**Sessions:**
- `POST /api/sessions` - Create interview session
- `GET /api/sessions` - List sessions
- `POST /api/sessions/complete` - Complete session
- `POST /api/sessions/batch-summary` - Generate batch summaries

**Weaviate:**
- `POST /api/weaviate/init` - Initialize schema
- `GET /api/weaviate/sessions` - Query sessions
- `POST /api/weaviate/test-connection` - Test connection

### Database Schema

The application uses Weaviate for vector storage. Key classes:

- `ResearchGoal` - Research objectives and metadata
- `InterviewSession` - Session lifecycle and state
- `TranscriptChunk` - Conversation segments with embeddings
- `PsychometricProfile` - Personality trait analysis
- `InterviewSummary` - Aggregated insights

See `interview/lib/weaviate/weaviate-schema.ts` for full schema definitions.

## 🚀 Deployment

### Production Setup

1. **Environment Configuration:**
   ```bash
   cp config/env.example .env.production
   # Configure production environment variables
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   - Vercel: `vercel deploy`
   - Docker: Use `config/Dockerfile`
   - Custom: Follow Next.js deployment guide

### Deployment Scripts

- `scripts/setup.sh` - Initial project setup
- `scripts/deploy.sh` - Production deployment
- `scripts/setup-weaviate.sh` - Weaviate database setup
- `scripts/setup-weaviate-cloud.sh` - Weaviate Cloud setup

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 🔒 Security Considerations

- ⚠️ **Authentication**: Currently not implemented - add before production
- ⚠️ **Rate Limiting**: Not implemented - recommended for production
- ⚠️ **Data Encryption**: Ensure sensitive data is encrypted at rest
- ⚠️ **API Keys**: Never commit API keys to version control
- ⚠️ **GDPR Compliance**: Review data handling for compliance

## 📊 Monitoring & Observability

- **Phoenix Integration**: Optional LLM observability via OpenTelemetry
- **Logging**: Console logging (consider structured logging for production)
- **Error Tracking**: Consider integrating Sentry or similar

## 🤝 Contributing

Contributions are welcome! Please refer to the documentation in the `docs/` directory for:

- Architecture specifications
- Technical design documents
- Implementation guides
- Code style guidelines

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (when test suite is implemented)
5. Submit a pull request

## 📝 License

[Add your license here]

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Beyond Presence for avatar technology
- Weaviate for vector database
- LangChain for agent orchestration
- Phoenix (Arize AI) for observability

## 📞 Support

For questions, issues, or contributions:
- Open an issue on GitHub
- Refer to the [documentation](docs/)
- Review the [System Audit](docs/SYSTEM_AUDIT_AND_PRODUCT_STRATEGY.md) for architecture details

---

**Built with ❤️ for product teams who need deep user insights, instantly.**