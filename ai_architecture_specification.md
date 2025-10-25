# AI architecture and specification

This document defines the logical architecture for the AI‑powered interview
assistant and specifies the responsibilities of each agent, memory layer
and integration point.  It builds upon the high‑level and component
diagrams in `technical_design.md` and `architecture.md` but focuses on
behavioural and data‑flow aspects.

## 1. Architectural overview

The system comprises three main layers:

1. **User interfaces:** An admin dashboard where researchers define the
   study goal, answer clarifying questions and approve the script; and a
   respondent page that embeds **Beyond Presence**’s avatar to conduct the
   conversation.
2. **Agent orchestration back end:** A server (Python/FastAPI or Node)
   running a multi‑agent orchestrator.  It receives input from the UI,
   invokes large language models via an agent framework (e.g., LangChain
   with LangGraph or CrewAI), retrieves context from a vector store,
   generates responses and forwards them to Beyond Presence for
   rendering.
3. **Data & observability layer:** A vector database (**Weaviate**) that
   stores research goals, interview plans, transcript chunks and
   psychometric profiles; and an observability platform (**Phoenix**) that
   captures OpenTelemetry traces and evaluation metrics【336324534843598†L110-L133】.

### Audio/video streaming

The adoption of **Beyond Presence’s Managed Agents API** shifts audio and
video processing out of our codebase.  The front‑end SDK sends microphone
and camera streams to Beyond Presence, which performs speech‑to‑text,
text‑to‑video and returns a high‑quality avatar with lip‑synced video
【413673914178042†L23-L39】.  The server exchanges messages via HTTP or
WebSocket: it forwards the interviewer’s textual replies to Beyond Presence
and receives transcripts and session events.  This design eliminates the
need for local STT/TTS pipelines and simplifies the back‑end.

## 2. Agent specifications

### Clarification agent

* **Purpose:** gather essential information about the research goal before
  generating a script.  Ask only a few high‑impact questions and avoid
  assumptions or leading phrasing.
* **Inputs:** free‑form goal description from the admin.
* **Outputs:** a structured brief containing the refined goal, target
  audience, sensitive topics and desired interview duration.
* **Implementation:** a single LLM call with a system prompt framing the
  agent as a senior user‑research strategist.  Use follow‑up logic to
  request missing details and stop when the brief is complete.

### Interview planner agent

* **Purpose:** turn the clarified goal into an interview script with an
  introduction, an opening question and ~6 main questions plus optional
  follow‑ups.  Balance thoroughness with brevity; avoid yes/no questions
  and encourage storytelling.
* **Inputs:** the structured brief from the clarification agent.
* **Outputs:** a JSON plan with fields `introduction`, `questions` and
  `followUps`.  Each question includes a topic label for retrieval.
* **Implementation:** use heuristics to determine the number of questions
  (e.g., 4–10, depending on the number of topics).  The agent queries
  Weaviate for similar studies to avoid duplication and refine its
  suggestions.

### Interviewer agent

* **Purpose:** conduct the live interview.  Present the introduction,
  sequentially ask questions from the plan, listen to the respondent’s
  answers (via the transcript feed) and decide when to probe deeper or
  move on.
* **Inputs:** the approved script, a running transcript of the current
  session, summarised chunks from previous answers, and memory of which
  questions have been asked.
* **Outputs:** textual prompts that are sent to Beyond Presence for
  rendering.  Optionally returns structured actions (`ask`, `follow_up`,
  `end`) to control the flow.
* **Memory management:** The interviewer maintains **short‑term memory** in
  the form of a thread or state object.  As described in Jit’s design for
  agentic memory, each session maintains both a full history (for the
  LLM) and a streamlined history (for the UI)【589496838165006†L134-L142】.
  After each answer, a summariser agent compresses the content into a
  concise representation to avoid exceeding the LLM context window
  【589496838165006†L146-L160】.  Only the most recent summaries and the
  current plan are kept in short‑term memory.

### Summariser agent

* **Purpose:** generate concise summaries of each respondent answer,
  capturing salient points, sentiment and topic tags.  These summaries are
  stored in Weaviate along with embeddings.
* **Inputs:** a transcript segment (e.g., the last answer) and existing
  session state.
* **Outputs:** a short paragraph or bullet list and metadata such as
  keywords and sentiment score.
* **Implementation:** call an LLM with a summarisation prompt that
  references the research goal and prior summaries.  Update the
  session’s state and persist the chunk in Weaviate.

### Psychometric agent

* **Purpose:** after the interview, analyse the entire conversation to
  estimate the respondent’s Big Five personality traits and optionally an
  Enneagram type.  Provide reasoning for each score.
* **Inputs:** the full transcript and summarised chunks.
* **Outputs:** a JSON object with numeric scores (0–100) for openness,
  conscientiousness, extraversion, agreeableness and neuroticism, plus
  textual explanations.  May also include an Enneagram estimate.
* **Implementation:** use an LLM with a carefully crafted system prompt
  describing the psychometric model.  Optionally cross‑reference heuristics
  (e.g., number of adjectives indicating conscientiousness) to validate the
  LLM’s output.

## 3. Memory strategy

The system uses a **dual‑layer memory** architecture:

* **Short‑term memory** exists per session.  It stores the current plan,
  recent questions and answers and the latest summaries.  To prevent the
  LLM from hitting its context limit, older turns are summarised and
  pruned【589496838165006†L134-L149】.  A dual history (full vs. streamlined)
  ensures that the LLM receives all necessary context while the UI shows
  only relevant messages.
* **Long‑term memory** persists across sessions.  When the session ends,
  the summariser and psychometric agents extract key insights and update
  the **InterviewChunk** and **PsychProfile** classes in Weaviate.  This
  enables RAG across multiple interviews.  The `Mem0` paper highlights
  that a persistent memory mechanism is essential for long‑term coherence
  and for avoiding contradictions in subsequent interactions【890538852658032†L38-L40】.

## 4. Retrieval‑augmented generation

All agents rely on Weaviate for contextual retrieval.  Documents are
chunked (200–300 tokens for research documents, individual answers for
transcripts) and embedded using a model like `text-embedding-ada-002`.  The
interviewer queries Weaviate (e.g., `nearText`) to recall similar past
answers and avoid asking redundant questions.  The summariser uses RAG to
generate comprehensive session summaries, and cross‑session analysis can
identify patterns across demographics.  Metadata (speaker, topic,
timestamp) supports targeted queries.

## 5. Integration with Beyond Presence

Beyond Presence offers two APIs: a **Speech‑to‑Video (S2V) API** that
transforms audio into a high‑quality avatar and a **Managed Agents API**
that couples the avatar with LLM prompting, memory APIs and knowledge‑base
integration【413673914178042†L23-L39】【413673914178042†L54-L67】.  In this
project we use the Managed Agents API.  Key integration points:

1. **Agent configuration:** define a prompt and persona for the interviewer
   within Beyond Presence’s console.  Configure memory and knowledge‑base
   retrieval to align with your Weaviate schema.
2. **Streaming:** embed the JavaScript SDK in the respondent UI.  It
   handles microphone/camera capture, low‑latency transport and video
   rendering.  On the back end, maintain a WebSocket connection to
   exchange transcripts and replies.
3. **Session management:** store Beyond Presence session IDs alongside
   your internal session IDs.  Use webhooks to receive transcript updates
   and pass them to the summariser and interviewer agents.

By outsourcing audio/video processing to Beyond Presence, the
architecture remains focused on conversation logic and retrieval.  The
integration is vendor‑agnostic—should another S2V provider emerge, the
streaming layer can be swapped without affecting agent logic.

## 6. Observability and evaluation

To ensure reliability and continuous improvement, integrate **Phoenix**:

* **Tracing:** wrap all agent functions with Phoenix’s OpenTelemetry
  instrumentation.  This records calls to LLMs, retrieval functions and
  external APIs (e.g., Beyond Presence), capturing latencies and errors
  【336324534843598†L110-L117】.
* **Evaluations:** use Phoenix’s evaluation library to benchmark
  responses for relevance, hallucination and adherence to guidelines
  【336324534843598†L119-L133】.  Store evaluation results in Weaviate for
  cross‑session analysis.
* **Datasets & experiments:** create versioned datasets when you
  experiment with different prompts, retrieval strategies or model
  providers.  Phoenix facilitates A/B testing and helps you choose the
  most effective configuration【336324534843598†L154-L162】.

## 7. Summary

This specification provides a blueprint for building an AI interviewer
that combines multi‑agent orchestration, retrieval‑augmented reasoning,
persistent memory and realistic avatar rendering.  By embracing Beyond Presence’s
Managed Agents, we offload the complexity of audio/video streaming
and focus on delivering insightful, empathetic interviews.  Memory is
managed across short‑ and long‑term horizons, enabling coherent
conversations within a session and knowledge accumulation across multiple
respondents.  Observability via Phoenix ensures that the system can be
debugged, evaluated and iterated upon efficiently.