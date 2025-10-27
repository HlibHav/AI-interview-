# AI Interview Assistant

An AI-powered user research interview platform that conducts qualitative interviews without human moderators.

## Project Structure

```
interview/
├── app/                          # Next.js app directory
│   ├── admin/                    # Admin dashboard pages
│   ├── api/                      # API routes
│   │   ├── agents/               # AI agent endpoints
│   │   ├── beyond-presence/       # Beyond Presence integration
│   │   ├── sessions/              # Session management
│   │   └── weaviate/              # Weaviate database operations
│   ├── components/                # React components
│   │   └── ui/                    # UI components
│   ├── respondent/                # Interview participant interface
│   └── globals.css               # Global styles
├── lib/                          # Shared utilities and libraries
│   ├── weaviate/                  # Weaviate database utilities
│   │   ├── index.ts              # Main exports
│   │   ├── weaviate-helpers.ts   # Database helpers
│   │   ├── weaviate-reference-utils.ts # Reference utilities
│   │   ├── weaviate-schema.ts    # Database schema
│   │   └── weaviate-session.ts   # Session operations
│   ├── sessionManager.ts         # Session management
│   └── utils.ts                  # General utilities
├── types/                        # TypeScript type definitions
│   └── interview.ts              # Interview-related types
├── public/                       # Static assets
└── docs/                         # Documentation
```

## Key Features

- **AI-Powered Interviewing**: Advanced AI agents conduct natural conversations
- **Psychological Profiling**: Generate Big Five personality traits and Enneagram types
- **Real-time Analysis**: Live transcription, summarization, and sentiment analysis
- **Session Management**: Complete interview lifecycle management
- **Weaviate Integration**: Vector database for storing and retrieving interview data

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp config/env.example .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

- `/api/agents/*` - AI agent operations
- `/api/sessions/*` - Session management
- `/api/weaviate/*` - Database operations
- `/api/beyond-presence/*` - Beyond Presence integration

## Database Schema

The application uses Weaviate for storing interview sessions, transcripts, and insights. The schema is defined in `lib/weaviate/weaviate-schema.ts`.

## Contributing

Please refer to the documentation in the `docs/` directory for detailed information about the architecture and implementation.