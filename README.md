# AI‑Interview Assistant: Project Overview

This repository contains the code and documentation for an AI‑powered
interview assistant built for a hackathon.  The goal is to allow research
teams to run qualitative interviews without human moderators.  An AI agent
introduces itself, asks open questions, listens attentively and generates
follow‑ups.  The system transcribes audio in real time, summarises
responses, derives psychological profiles and provides actionable insights.

## Features

- **Script generation:** Given a research goal, the assistant asks
  clarifying questions and produces an interview plan with an introduction
  and 5–8 open questions.  Researchers can edit the script before
  approving it.
 - **Voice/video interviewing via Beyond Presence:** Respondents click a link,
  grant microphone (and optionally camera) access and participate in a
  recorded conversation powered by **Beyond Presence’s Managed Agents**.  The
  platform streams audio to a hyper‑realistic avatar, handles
  speech‑to‑text/–to‑video conversion and allows pausing and resuming【413673914178042†L23-L39】.
 - **Real‑time transcription and summarisation:** Beyond Presence returns
  transcripts from the audio stream.  Our summariser agent condenses each
  answer into semantic chunks and stores them in **Weaviate**, eliminating
  the need for a separate STT pipeline.
- **Psychometric profiling:** After the interview, the system estimates
  Big Five personality traits (openness, conscientiousness, extraversion,
  agreeableness and neuroticism) and optionally an Enneagram type, then
  renders a radar chart.
- **Observability and evaluation:** Integration with **Phoenix** collects
  traces from the agents and evaluates responses using built‑in and
  third‑party metrics【336324534843598†L119-L133】.  This helps debug
  latency issues and measure answer relevance.
- **Retrieval‑augmented generation:** All data (goals, plans, transcripts)
  are stored in **Weaviate**.  Agents use vector search to recall
  context and generate informed questions and summaries.

## Architecture summary

The system is divided into three major layers:

1. **Front end (React/Next.js):** Contains the admin console and
   respondent interface.  Communicates with the back end via REST and
   WebRTC.
2. **Back end (FastAPI or Node):** Hosts the LLM agent orchestrator, Weaviate
   client and Phoenix instrumentation.  It manages session state and
   coordinates agents.  Audio and video streaming are delegated to
   **Beyond Presence’s Managed Agents**, so no separate STT/TTS pipelines are
   required.
3. **Data stores:** Weaviate holds vectorised data for retrieval.  Phoenix
   stores traces and evaluation metrics.  See `architecture.md` for a
   component‑level diagram and `ai_architecture_specification.md` for a
   behavioural specification of the agents and memory.

## Getting started

1. **Install dependencies**

   ```bash
   # Clone this repository
   git clone <your‑repo‑url>
   cd ai‑interview‑assistant

   # Install Python packages
   pip install -r requirements.txt

   # Install Phoenix instrumentation (optional but recommended)
   pip install arize-phoenix-otel openinference-instrumentation-openai
   ```

2. **Run Weaviate**

   Start a local Weaviate instance using Docker:

   ```bash
   docker run -p 8080:8080 -e QUERY_DEFAULTS_LIMIT=20 \
     -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
     semitechnologies/weaviate:1.24.0
   ```

3. **Launch Phoenix (optional)**

   Install the CLI and start a server locally:

   ```bash
   pip install arize-phoenix
   phoenix serve
   ```

   Set environment variables in your shell or `.env` file:

   ```bash
   export PHOENIX_API_KEY=your_api_key
   export PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006
   ```

4. **Start the back end**

   ```bash
   uvicorn app.main:app --reload
   ```

5. **Start the front end**

   ```bash
   cd interview
   npm install
   npm run dev
   ```

Visit `http://localhost:3000` to access the admin dashboard and create a research goal. Use the generated link to simulate a respondent session.

**Note:** The main application is located in the `interview/` directory.

## License

This project is provided for educational purposes during a hackathon.  It may
contain dependencies governed by separate open‑source licenses.  Use it at
your own risk.
