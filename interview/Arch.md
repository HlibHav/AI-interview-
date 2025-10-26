# Architecture Overview

This document describes the end-to-end architecture of the AI Interview Assistant, a full-stack Next.js platform that delivers AI-led qualitative interviews, live analytics, and psychometric insights.

## 1. System Context
- **Application shell**: Next.js 14 (App Router) with React 18, TypeScript, Tailwind CSS, Radix UI, and Recharts.
- **Backend runtime**: Next.js API routes sharing the same deployment as the UI; no separate server is required.
- **External services**:
  - OpenAI GPT-4 for reasoning across all agent flows.
  - LiveKit for WebRTC rooms (media transport).
  - Beyond Presence (BEY) for avatar-controlled AI interviewers.
  - Weaviate vector database for long-term research memory.
  - Optional Phoenix for LLM observability/telemetry.

## 2. High-Level Flow
1. **Research setup**: Admin defines a research goal in the dashboard (`app/admin/page.tsx`). The UI uses React Hook Form + Zod to validate inputs and calls `/api/agents/clarification` for refinement.
2. **Script generation**: Once clarified, `/api/agents/planner` transforms briefs into structured interview scripts (intro, questions, follow-ups).
3. **Session provisioning**: `/api/sessions` (in-memory) issues a shareable respondent link; `SessionManager` can mirror data into Weaviate (`app/api/weaviate/sessions/route.ts`).
4. **Interview execution**: Respondent joins `/respondent`, granting media permissions and launching `BeyondPresenceInterviewRoom`. The component initializes a BEY agent, waits for LiveKit readiness, and connects both parties.
5. **Live intelligence**: During the interview, orchestration can call `/api/agents/interviewer` for dynamic follow-ups and `/api/agents/summarizer` to capture transcript chunks with key insights.
6. **Post-interview analytics**: `/api/agents/psychometric` builds Big Five + Enneagram profiles. Admin analytics (`app/admin/analytics/page.tsx`) renders aggregated dashboards with Recharts.

## 3. Frontend Architecture
### Admin Workspace (`app/admin`)
- Multi-step workflow: research goal input → clarification Q&A → script generation → session creation.
- Uses optimistic UI paradigms with fallback messaging when API failures occur.
- Stores interview scripts in state and surfaces generated respondent URLs.

### Analytics (`app/admin/analytics`)
- Fetches all sessions via `/api/sessions`.
- Renders overview metrics (participants, completion rate) and trait visualizations (radar + bar charts).
- Allows session-level drill-down to psychometric data.

### Respondent Experience (`app/respondent`)
- Fetches session metadata (goal, context) on load; enforces email capture.
- `CameraPermissionPrompt` mediates device access before connecting to LiveKit.
- `BeyondPresenceInterviewRoom` manages agent initialization, LiveKit connection, track subscription, conversation log, and cleanup.
- Fallback logic (e.g., `hardDisconnect`) protects against partial failures.

### Shared Components & Utilities
- UI primitives live under `app/components` and `app/components/ui`.
- Interview transport helpers:
  - `app/lib/bp.ts`: idempotent Beyond Presence session creation and readiness polling.
  - `app/lib/livekit.ts`: LiveKit token fetch + connection + agent track waiters.
  - `app/lib/sessionManager.ts`: API wrapper that abstracts session CRUD and schema bootstrap against Weaviate-backed storage.

## 4. Backend / API Layer
### Agent Endpoints (`app/api/agents/*`)
- **Clarification**: Collects three clarifying questions via GPT-4, optionally persisting goals to Weaviate.
- **Planner**: Generates interview scripts, normalizes GPT output to JSON, and stores `QuestionPlan`.
- **Interviewer**: Determines next action (ask follow-up, move on, end) based on transcript state and optional Weaviate semantic recall.
- **Summarizer**: Produces short summaries, key themes, sentiment, and writes `InterviewChunk` vectors.
- **Psychometric**: Creates Big Five + Enneagram profiles with reasoning, storing `PsychProfile`.

### Session Management
- `app/api/sessions/route.ts`: Simple in-memory session store used by the current UI.
- `app/api/weaviate/sessions/route.ts`: Production-grade CRUD that persists sessions, scripts, transcripts, insights, and psychometric profiles to Weaviate (JSON stored as strings; parsed on read).
- `app/lib/sessionManager.ts`: Client-side abstraction to switch between in-memory and persistent stores without changing UI code.

### Weaviate Integration (`app/api/weaviate`)
- `route.ts`: Generic schema bootstrap (`create_schema`), data storage (`store`), and semantic search for classes `ResearchGoal`, `QuestionPlan`, `InterviewChunk`, and `PsychProfile`.
- `sessions/route.ts`: Dedicated schema and CRUD for `InterviewSession`.
- Schema creation is lazy; on-demand calls initialize classes if absent.

### LiveKit & Beyond Presence
- `app/api/livekit-token/route.ts`: Mints JWTs via `livekit-server-sdk`, granting scoped publish/subscribe rights.
- `app/api/beyond-presence/*`:
  - `initialize`: Builds agent prompt (including script, goals) and registers an avatar with BEY.
  - `create-session`: Exchanges LiveKit tokens, creates BEY session, and caches results for idempotency.
  - `session-status`: Polls BEY for readiness; used before joining LiveKit to avoid empty rooms.
  - `cleanup`: Tears down sessions to limit resource use.
- `app/api/direct-interview/start/route.ts`: Lightweight path for LiveKit-only interviews without avatars.

### Auxiliary APIs
- `/api/health`: Used by Docker health checks and setup automation.
- `/api/test-openai`, `/api/test-env`, etc., assist with environment validation during setup.

## 5. Data & Persistence
- **Weaviate** is the long-term store for research artifacts:
  - `ResearchGoal`: goal text, clarifications, metadata.
  - `QuestionPlan`: generated scripts and follow-ups.
  - `InterviewChunk`: transcript segments enriched with summaries, keywords, sentiment.
  - `PsychProfile`: personality scores and explanations.
  - `InterviewSession`: holistic session metadata, transcripts, insights, psychometrics.
- **In-memory Map** (development convenience) powers `/api/sessions`. Production deployment should route through `SessionManager` into Weaviate.
- Semantic search via Weaviate powers context-aware prompts in the interviewer agent by retrieving similar past answers.

## 6. External Configuration
- `.env.local` derived from `env.example` captures:
  - `OPENAI_API_KEY`, `WEAVIATE_HOST`, `WEAVIATE_API_KEY`
  - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL`
  - `BEY_API_KEY`, `BEY_AVATAR_ID`, optional Phoenix variables
- `setup.sh` bootstraps dependencies, starts Weaviate via Docker Compose, runs readiness checks, and smoke-tests critical endpoints.

## 7. Deployment & Operations
- **Docker Compose** (`docker-compose.yml`):
  - Spins up Weaviate, the Next.js app (production build), and optional Phoenix.
  - Defines health checks to enforce start order (Weaviate → App).
- **Dockerfile**:
  - Multi-stage (deps → builder → runner) producing a minimal runtime image using Next.js standalone output.
  - Runs as non-root (`nextjs`) and exposes port 3000.
- **Health monitoring**: `/api/health` plus console logs provide operational visibility; Phoenix can capture LLM traces when enabled.

## 8. Observability & Logging
- Verbose logging across API routes traces agent requests, LiveKit token generation, and Beyond Presence lifecycle events.
- Phoenix integration (optional) enables deeper inspection of prompts, completions, and latency if instrumented.

## 9. Extensibility & Future Work
- Agents are modular—new behaviors can be added under `app/api/agents/<new-agent>` and consumed from the UI.
- `SessionManager` abstraction allows migrating from in-memory storage to any persistence layer while preserving the UI contract.
- `app/lib/bp.ts` and `app/lib/livekit.ts` centralize media orchestration logic, simplifying swaps to alternative avatar or RTC providers.
- Current `/api/sessions` responses can be enhanced to stream live transcripts or insights as they are stored in Weaviate.

## 10. Security & Privacy Notes
- Clarification prompts encourage admins to flag sensitive topics; interview scripts include consent reminders.
- LiveKit tokens are minted server-side with strict room scoping.
- Weaviate storage calls should be secured with API keys and TLS in production deployments.
- Future enhancements should include authentication/authorization for admin routes, encrypted storage for transcripts, and GDPR-compliant retention policies.

---

This architecture supports rapid qualitative research by combining AI-driven conversation flows with rich analytics, while remaining deployable as a single Next.js application backed by modular integrations.
