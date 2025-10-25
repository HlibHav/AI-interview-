# Technical design for an AI‑powered user‑interview assistant

This document proposes a technical architecture and workflow for the hackathon
project described in the briefing.  It assumes you will build the project with
modern web tooling (React/Next.js, tailwind css,, Python or Node.js on the
back end, clear file structure for front and backend on the front end) and make heavy use of large language models (LLMs), retrieval‑
augmented generation (RAG) and vector databases such as **Weaviate**.

## 1. Goals and core features

Your system should enable research teams to run qualitative interviews without
human moderators.  It has three primary user personas:

1. **Admin/Researcher** – defines the research goal (e.g., “discover flirting
   habits of users”), answers clarifying questions and approves the interview
   script.
2. **Respondent** – receives a link, grants microphone (and optionally camera)
   access, and participates in an AI‑led conversation.
3. **Analyst** – reviews transcripts, summaries and psychometric profiles.

Key functionality:

* **Clarification & script generation:** After receiving the research goal,
  the system prompts the admin for essential clarifications (target audience,
  sensitive topics, desired depth).  It then generates a **concise interview
  plan** containing an introduction, an initial open question and ~5–8 core
  questions, with optional follow‑ups.  Admins can edit the plan; the system
  iteratively updates it.
* **Voice (and optional video) interviewing:** Respondents click a link, give
  consent for audio (and optionally video) streaming and provide their email.
  The AI interviewer introduces itself, states the purpose of the study and asks
  open questions.  It listens attentively, uses sentiment cues and
  conversation context to generate follow‑up questions, and allows the
  respondent to pause and resume.
* **Real‑time transcription and analysis:** Speech‑to‑text (STT) runs
  continuously to produce accurate transcripts.  A summarisation agent
  periodically summarises answers and updates the context window.  After the
  session, an analytics pipeline derives insights and builds a **psychological
  profile** (e.g., Big Five/OCEAN traits and an Enneagram estimate).  The
  system outputs an easily digestible report with a radar chart.
* **Secure data handling:** All recordings, transcripts and embeddings are
  stored securely.  Only anonymised data are used for model improvement.

## 2. High‑level architecture

```
           ┌────────────┐         ┌───────────────┐
           │  Front end │         │  Back end     │
           │(Next.js)   │         │(FastAPI/Node) │
           └──────┬─────┘         └────┬──────────┘
                  │                    │
      WebRTC/HTTP │                    │ Beyond Presence API (audio/video)
                  ▼                    ▼
            Audio/video      ┌────────────────────────┐
             streaming       │ LLM Agent Orchestrator │
                            ├────────────────────────┤
                            │ Clarification Agent    │
                            │ Planner Agent          │
                            │ Interviewer Agent      │
                            │ Summariser Agent       │
                            │ Psychometric Agent     │
                            └───────────┬────────────┘
                                        │
                          Retrieval (RAG) & Memory
                                        │
                                        ▼
                           ┌────────────────────────┐
                           │  Weaviate Vector DB    │
                           │  (transcripts, plans,  │
                           │   research goals)       │
                           └────────────────────────┘
```

* **Front end (React/Next.js):** Implements the admin console (script
  generation) and respondent interface.  It integrates the **Beyond Presence
  Managed Agents SDK** to stream audio from the respondent and render the
  AI interviewer as a hyper‑realistic avatar.  The SDK handles microphone
  access, low‑latency audio/video transport and lip‑synced avatar
  rendering【413673914178042†L23-L39】.  A fallback can use voice‑only mode if
  Beyond Presence is unavailable.
* **Back end (Python FastAPI or Node.js/Express):** Hosts the LLM agents and
  orchestrates the conversation.  It no longer runs separate STT or TTS
  services—the Managed Agents platform performs speech‑to‑text, text‑to‑speech
  and video rendering on your behalf【413673914178042†L23-L39】.  The back end
  communicates with the Beyond Presence API to send text responses and
  configure the agent’s personality.  It provides REST/WebSocket endpoints
  for script generation, session management and analytics.
* **LLM agent orchestrator:** Coordinates multiple agents using a framework
  such as **LangChain**, **LlamaIndex** or **CrewAI**.  Each agent has its
  own system prompt and responsibilities.  Agents share a memory store
  persisted in Weaviate.  A central controller decides which agent to call
  based on the stage (clarifying, planning, interviewing, summarising,
  profiling).
* **Weaviate vector database:** Stores all unstructured data (research goals,
  plans, conversation transcripts) as semantic vectors.  Supports fast
  similarity search via `nearText`/`hybrid` queries.  This powers RAG by
  providing context to the LLM when generating questions, summarising or
  deriving psychological traits.
* **Video avatars via Beyond Presence:** To enhance engagement, we adopt
  **Beyond Presence’s Managed Agents** as the default avatar solution.  The
  front end streams audio to Beyond Presence and receives synchronised video
  frames【413673914178042†L23-L39】.  If Beyond Presence is unavailable, you can
  fall back to a voice‑only mode or integrate an open‑source avatar
  renderer.  The underlying agent architecture remains unchanged; only the
  output modality differs.

## 3. Recommended technology stack

| Layer                | Choices / rationale |
|----------------------|--------------------|
| **Front end**        | **React/Next.js** with TypeScript for modern developer experience and SSR.  Use `react-use-web-rtc` for audio streaming.  For charts and dashboards, integrate **Chart.js** or **Recharts**. |
| **Back end**         | **Python FastAPI** (or **Node.js/Express**) for REST and WebSocket endpoints.  Python provides rich LLM libraries and easier integration with LangChain, LlamaIndex and Weaviate clients. |
| **Avatar & streaming** | **Beyond Presence Managed Agents** for low‑latency speech‑to‑video streaming and hyper‑realistic avatars【413673914178042†L23-L39】.  The SDK handles speech‑to‑text, text‑to‑speech and lip‑synced video rendering.  Optionally integrate fallback STT/TTS services (e.g., OpenAI Whisper and ElevenLabs) for voice‑only mode. |
| **Vector DB**        | **Weaviate** (open source) for storing embeddings.  Use `text-embedding-ada-002` or a local **Sentence‑Transformers** model to generate embeddings.  Configure classes such as `InterviewChunk`, `ResearchGoal` and `QuestionPlan` with appropriate properties. |
| **Agent framework**  | **LangChain** for multi‑agent orchestration.  They provide tools for building memory buffers, conversation history and RAG chains. |
| **LLM**              | **OpenAI GPT‑4**, via API.  During the hackathon, GPT‑4’s strong reasoning makes it a safe choice.  Use function calling/JSON modes for structured outputs. |
| **Psychometric analysis** | Use an LLM to rate statements along the Big‑Five axes.  Optionally combine with rules‑based heuristics (e.g., counting adjectives indicating openness, conscientiousness etc.).  For Enneagram, use fine‑tuned models or heuristics. |
| **Visualization**    | Use **Chart.js** or **D3.js** on the front end to render radar charts of personality traits.  Generate the underlying data in the back end. |
| **Deployment**       | Dockerise services.  For quick demo, host on Vercel/Netlify (front end) and Fly.io/Render (back end).  Host Weaviate via the provided Docker image or use Weaviate Cloud. |

## 4. Multi‑agent design

### 4.1 Clarification agent

* **Inputs:** raw research goal from admin.
* **Responsibilities:** ask concise, high‑impact clarification questions (e.g., target
  audience, specific behaviours, constraints such as sensitive topics).  Use
  follow‑up logic: if the admin provides partial answers, politely ask for
  missing pieces.  Avoid asking for information that isn’t strictly needed.
* **Prompt outline:**
  > You are a senior user‑research strategist.  You need to prepare an interview
  > plan.  Ask me a small number of questions to clarify the goal.  Do not
  > generate the plan until you have all essential information.  Frame your
  > questions neutrally and avoid making assumptions.

Responses from this agent are appended to the clarification log stored in
Weaviate.

### 4.2 Interview planner agent

* **Inputs:** research goal and clarifications.
* **Responsibilities:** produce a structured interview script: a warm
  introduction (agent introduces itself and explains recording & privacy), one
  opening question, ~6–12 open questions covering the study topics, and
  suggested follow‑ups.  Ensure the questions are non‑leading and allow the
  respondent to narrate experiences.  Limit yes/no questions.
* **Heuristics for number of questions:**
  * `minQuestions = max(6, numberOfTopics × 2)`
  * `maxQuestions = 12`
  * adjust if the admin specifies depth or time limit.  For a 5‑minute interview,
    plan about 6 main questions plus clarifiers.
* **Prompt outline:**
  > You are an expert qualitative researcher.  Given a research goal and
  > clarifications, draft an interview plan.  Write a welcome paragraph and
  > propose a sequence of open questions.  Provide one bullet per question,
  > grouped by topic.  Limit the total number of questions to what can be
  > covered in the target duration.  Include optional follow‑ups to probe
  > deeper if needed.  Output the plan as a JSON object with fields like
  > `introduction`, `questions` (array) and `followUps` (map).

The plan is stored in Weaviate for retrieval and revision.

### 4.3 Interviewer agent

* **Inputs:** approved script, running transcript, last user answer, memory of
  prior questions.
* **Responsibilities:** conduct the live conversation.  Read the introduction,
  ask the first question and listen.  After each answer, summarise key points
  via the summariser agent.  Decide whether to ask a planned follow‑up or move
  to the next main question.  Generate impromptu follow‑ups if the respondent
  mentions unexpected but relevant insights (use RAG to recall research goals and
  similar past interviews).  The interviewer must remain polite, avoid
  judgmental phrasing and respect pauses.  At the end, thank the respondent and
  explain next steps.
* **Implementation tips:**
  * Use **LangChain**’s agent executor with a **ConversationalBufferMemory** to
    maintain recent context.
  * Use **event‑driven** logic: when the STT pipeline emits a “speaker
    finished” event, trigger the summariser, then update the interviewer’s
    context and generate the next question via the LLM.  Use function
    calling to return structured results (e.g., `{action: "ask", text: "…"}` or
    `{action: "follow_up", reason: "participant mentioned X"}`).

### 4.4 Summariser agent

* **Inputs:** a transcript chunk (e.g., last answer).
* **Responsibilities:** generate a concise bullet summary and update the
  Weaviate `InterviewChunk` objects with keywords and sentiment scores.  Use
  RAG to recall what has been discussed so far and avoid repetition.  Provide a
  high‑level summary at session end.

### 4.5 Psychometric agent

* **Inputs:** full conversation transcript.
* **Responsibilities:** estimate the respondent’s **Big Five/OCEAN** personality
  traits and optionally an Enneagram type.  Use an LLM with a prompt like:
  > You are a psychologist.  Based on this conversation, estimate the
  > participant’s openness, conscientiousness, extraversion, agreeableness and
  > neuroticism on a 0–100 scale.  Provide reasoning for each score.

* **Output:** JSON structure with scores and rationales.  The front end renders
  this as a radar chart (similar to the sample screenshot).  Store the
  psychometric summary in Weaviate linked to the respondent.

## 5. Retrieval‑augmented generation (RAG) strategy

### 5.1 Chunking

* **Research documents and plans:** chunk by paragraphs or sections (~200–300
  tokens) with a small overlap (50 tokens).  Use semantic chunkers (e.g.,
  `recursiveCharacterTextSplitter` in LangChain) to avoid breaking sentences.
* **Interview transcripts:** treat each user answer and system question as
  separate chunks.  Include metadata such as `speaker`, `questionId`, `topic`
  and `timestamp`.

### 5.2 Embedding and storage

* Use OpenAI’s `text-embedding-ada-002` or a local model such as
  `sentence-transformers/all-MiniLM-L6-v2`.  Store each chunk in Weaviate with
  its embedding.  Define classes:

  ```
  class ResearchGoal { id, goalText, embedding }
  class QuestionPlan { id, researchGoalId, introduction, questions[], followUps }
  class InterviewChunk { id, sessionId, speaker, text, summary, traits[], embedding, timestamp }
  class PsychProfile { id, sessionId, openness, conscientiousness, extraversion, agreeableness, neuroticism, explanation }
  ```

* Configure Weaviate’s `vectorIndex` with appropriate distance metric (e.g., cosine).

### 5.3 Retrieval usage

* **Question generation:** when generating follow‑up questions, query Weaviate
  for the most similar previous answers (`nearText` with the current answer
  embedding) and for chunks related to the research goal.  Provide these as
  context to the LLM so it can avoid repetition and dig deeper.
* **Summarisation:** to summarise the conversation, retrieve all chunks for the
  session, sort by time and feed them to the summariser agent in batches.
* **Insight extraction:** cross‑session analysis can retrieve similar answers
  across different interviews to find patterns.  Use hybrid search with
  metadata filters (e.g., `filter: {speaker: "respondent"}`) to compare
  behaviours across demographics.

## 6. Using Weaviate

* **Local deployment:** spin up Weaviate via Docker in your development
  environment.  Use the `text2vec-openai` or `text2vec-transformers` module for
  on‑the‑fly embedding.
* **Schema management:** define classes as above and apply property
  configurations.  Use Weaviate’s GraphQL API to upsert objects and query
  vectors.
* **Generative search:** Weaviate supports generative search (beta), where you
  can pass a prompt and ask it to compose an answer using retrieved chunks.  This
  can aid summarisation: instruct Weaviate to “explain the key themes that
  participants mention when discussing flirting habits,” and it will generate a
  narrative based on stored data.

## 7. Integrating Beyond Presence

We adopt Beyond Presence’s **Managed Agents API** as our default interface for
real‑time audio/video streaming.  The Managed Agents platform provides
sub‑second latency, 1080p video, realistic avatars and built‑in memory and
context handling【413673914178042†L23-L39】.  To integrate:

* Sign up for Beyond Presence and configure a managed agent with your desired
  persona.  Provide a system prompt that defines the interviewer’s tone and
  instructions.  Beyond Presence’s memory APIs will persist context across
  exchanges and allow you to retrieve user profiles【413673914178042†L54-L67】.
* Use their JavaScript SDK in the front end to embed the agent.  The SDK
  acquires microphone/camera access, streams audio to Beyond Presence and
  renders the avatar’s video response.  This removes the need for separate
  STT/TTS pipelines in your codebase; you simply send text responses from
  your back end to the API and receive synchronised audio/video frames.
* The back end continues to orchestrate the LLM agents and RAG logic.  For
  each interviewer reply, send the generated text to Beyond Presence’s API
  along with session metadata; the platform returns a video stream that is
  forwarded to the client.  In the opposite direction, Beyond Presence sends
  real‑time transcript data back to your server so that the summariser and
  psychometric agents can update context.

Although we commit to the managed option, you may still support a
**voice‑only** fallback by bypassing the avatar and sending text to a TTS
service like ElevenLabs.  However, this is optional and not part of the main
hackathon scope.

## 8. Putting it all together

1. **Setup:** spin up a Weaviate instance and create the schema.  Set up a
   FastAPI server with endpoints for script generation, session creation and
   streaming.
2. **Clarify goal:** when an admin enters a research topic, run the
   clarification agent until it returns a structured brief.  Store this in
   Weaviate.
3. **Plan interview:** feed the brief to the planner agent to get a script.
   Allow the admin to edit and iterate.  Once approved, generate a unique URL
   (e.g., `/session/{sessionId}`) for the respondent.
4. **Run session:** when the respondent joins, start STT and stream audio to
   the back end.  The interviewer agent reads the plan, asks questions via
   TTS (and optionally video), listens, summarises and iterates until the
   script is complete or time runs out.
5. **Analyse:** after the session, run the psychometric agent and summariser to
   produce a report.  Render charts and key insights in the admin console.
6. **Learn:** aggregated insights from multiple sessions can be used to refine
   future interview scripts automatically via a meta‑learning agent.

## 9. LLM observability and evaluation with Phoenix

As the system grows more complex and interacts with multiple LLM endpoints,
observability becomes critical.  Unexpected latency, hallucinations or
retrieval errors can degrade the interview experience.  To monitor and debug
our agents we integrate **Phoenix**, an open‑source observability and
evaluation platform from Arize AI.  Phoenix is language‑ and vendor‑agnostic
and works by collecting **traces** over the OpenTelemetry protocol and
storing them for analysis【336324534843598†L110-L116】.  Key features include:

* **Tracing:** instrument each agent (clarification, planner, interviewer,
  summariser and psychometric) using Phoenix’s OTEL library.  Traces record
  function calls, LLM requests, tool executions and latencies without vendor
  lock‑in【336324534843598†L110-L117】.  They can be viewed in Phoenix’s UI to
  understand how the application behaves and to identify bottlenecks or
  failures.
* **Evaluations:** Phoenix provides a standalone evaluation library that
  leverages LLMs to score the quality of responses (e.g., relevance,
  toxicity, faithfulness) and supports integration with third‑party evaluators
  such as Ragas, Deepeval and Cleanlab【336324534843598†L119-L133】.  During
  development you can run automatic benchmarks on your interview agent to
  measure answer relevance and compare different prompt strategies.
* **Datasets and experiments:** Phoenix lets you create versioned datasets
  and experiments to track changes in prompts, retrieval strategies and model
  choices【336324534843598†L154-L162】.  Weaviate remains the primary store for
  transcripts and plans, while Phoenix can be used for benchmarking and
  experimentation workflows.
* **Prompt engineering tools:** Phoenix includes a prompt playground and
  prompt management tools to iterate on prompts, compare model outputs and
  replay traced calls【336324534843598†L137-L149】.  This helps refine the
  interviewer’s tone and ensure non‑leading questions.

### 9.1 Implementation steps

1. **Deploy Phoenix:** run a self‑hosted instance via `phoenix serve` or use
   Arize’s managed cloud.  Obtain an **API key** and **collector endpoint**,
   then set `PHOENIX_API_KEY` and `PHOENIX_COLLECTOR_ENDPOINT` in your
   environment【45535578747345†L110-L133】.
2. **Install instrumentation packages:** add `arize-phoenix-otel` to your
   Python dependencies, along with any `openinference-instrumentation-*`
   packages for frameworks you use (e.g., OpenAI, LangChain or LlamaIndex)
  【45535578747345†L146-L195】.  The Phoenix OTEL package configures a
   `TracerProvider` that exports traces to Phoenix.
3. **Register a tracer:** in your application startup code, call
   `from phoenix.otel import register` and register your project name with
   `auto_instrument=True`.  This sets up automatic tracing for supported
   libraries and returns a tracer for manual spans【45535578747345†L286-L303】.
   Decorate custom functions (e.g., question generation) with
   `@tracer.chain` to capture input/output parameters【45535578747345†L267-L273】.
4. **Evaluate sessions:** after collecting interview transcripts, run
   Phoenix’s evaluation routines to score answer relevance, retrieval
   effectiveness and adherence to guidelines.  Store evaluation results
   alongside psychometric profiles for analysis.

By integrating Phoenix we gain real‑time visibility into the agent pipeline,
quantitative metrics for quality and an audit trail for compliance.  This
observability layer complements Weaviate’s retrieval and enables rapid
iteration during the hackathon.

## 10. Next steps

* **Prototype quickly:** begin by integrating Beyond Presence’s Managed
  Agents API for audio/video streaming.  Use GPT‑4 via LangChain to
  implement the clarification, planner and interviewer agents.  Weaviate
  serves as your memory store—keep the schema simple for the hackathon.
* **Iterate on user experience:** gather feedback from early testers (e.g.,
  colleagues) about question quality, pacing and the clarity of reports.
* **Expand modalities:** integrate Beyond Presence or another avatar service to
  create a more engaging respondent experience.
* **Explore fine‑tuning:** once enough interview data are collected, fine‑tune
  an open‑source LLM on your domain to improve interviewing style and
  psychometric accuracy.
* **Ethical review:** ensure compliance with data protection laws (GDPR) and
  conduct an ethical review of bias and fairness.  Provide transparent
  disclosure to respondents about the AI’s role and data usage.
