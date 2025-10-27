# AI Interview Assistant Project

A comprehensive AI-powered user research interview platform that conducts qualitative interviews without human moderators.

## Project Overview

This project consists of a Next.js application that provides AI-powered interview capabilities for user research and market validation studies.

## Repository Structure

```
interview/
├── interview/                     # Main Next.js application
│   ├── app/                      # Next.js app directory
│   ├── lib/                      # Shared utilities and libraries
│   ├── types/                    # TypeScript definitions
│   └── public/                   # Static assets
├── docs/                         # Project documentation
│   ├── architecture.md          # System architecture
│   ├── technical_design.md       # Technical design document
│   ├── evaluation_plan.md        # Evaluation methodology
│   └── ...                      # Other documentation files
├── scripts/                      # Setup and deployment scripts
│   ├── setup.sh                 # Main setup script
│   ├── setup-weaviate.sh        # Weaviate setup
│   └── deploy.sh                # Deployment script
├── config/                       # Configuration files
│   ├── docker-compose.yml        # Docker configuration
│   ├── Dockerfile               # Container definition
│   └── env.example              # Environment variables template
└── requirements.txt              # Python dependencies
```

## Quick Start

1. **Setup the environment**:
   ```bash
   cd interview
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp ../config/env.example .env.local
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

## Key Components

### Frontend Application (`interview/`)
- Next.js 14 application with TypeScript
- Admin dashboard for creating and managing interviews
- Respondent interface for participating in interviews
- Real-time AI agent integration

### AI Agents (`interview/app/api/agents/`)
- **Interviewer**: Main conversation agent
- **Planner**: Interview planning and script generation
- **Psychometric**: Personality analysis and profiling
- **Summarizer**: Interview summarization and insights
- **Clarification**: Follow-up question generation

### Database Integration (`interview/lib/weaviate/`)
- Weaviate vector database for storing interview data
- Session management and transcript storage
- Reference utilities for data relationships
- Schema definitions and helpers

### Documentation (`docs/`)
- Architecture specifications
- Technical design documents
- Evaluation plans and methodologies
- Implementation guides

## Features

- **AI-Powered Interviewing**: Natural conversation flow with AI agents
- **Psychological Profiling**: Big Five and Enneagram personality analysis
- **Real-time Processing**: Live transcription and analysis
- **Session Management**: Complete interview lifecycle
- **Vector Database**: Efficient storage and retrieval of interview data

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for Weaviate)
- OpenAI API key

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run api` - Start API server on port 3001

## Deployment

Use the scripts in the `scripts/` directory:
- `setup.sh` - Initial project setup
- `deploy.sh` - Production deployment
- `setup-weaviate.sh` - Database setup

## Contributing

Please refer to the documentation in the `docs/` directory for detailed information about the architecture, implementation, and contribution guidelines.