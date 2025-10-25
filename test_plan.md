# Test plan

This document describes the testing strategy for the AI‑interview assistant.
Comprehensive testing ensures that the system behaves as expected, provides
accurate results and delivers a smooth user experience.

## 1. Unit tests

- **Prompt generation:** Verify that the clarification and planner agents
  produce JSON with expected fields (`introduction`, `questions`,
  `followUps`).  Use static inputs and compare outputs against golden
  snapshots.
- **Summariser:** Test that the summariser agent generates concise
  summaries for sample transcripts.  Ensure that key points and emotional
  tones are retained.
- **Psychometric scoring:** Mock transcripts with known personality
  indicators and verify that the psychometric agent assigns reasonable
  scores.
- **Weaviate integration:** Test vector insertions and retrievals.  Ensure
  that `nearText` queries return the most similar chunks.
- **Phoenix instrumentation:** Ensure that registering a tracer and
  decorating functions create spans in a test environment.  Mock the
  collector endpoint to verify payload format.

## 2. Integration tests

- **End‑to‑end interview:** Simulate a full session by feeding pre‑recorded
  audio files into the STT pipeline.  Verify that questions, summaries and
  personality profiles are generated and stored.
- **Script editing:** Ensure that the admin can modify the interview plan
  and that changes persist.  Check that multiple revisions are versioned.
- **Pause/resume:** Test that pausing the interview halts transcription and
  agent generation, and that resuming continues seamlessly.
- **Multiple sessions:** Run concurrent interviews to ensure that the
  system can handle simultaneous streams without cross‑contamination.

## 3. Performance and load testing

- **Latency:** Measure the end‑to‑end latency from audio input to TTS
  output under normal and high‑load conditions.  Identify bottlenecks
  (e.g., STT or LLM calls) and evaluate the impact of Phoenix tracing.
- **Throughput:** Use load‑testing tools to simulate dozens of parallel
  sessions.  Ensure that WebRTC, STT and the back end scale horizontally
  without dropping packets.
- **Database performance:** Insert and query thousands of transcripts in
  Weaviate.  Monitor query times and evaluate caching strategies.

## 4. User acceptance testing (UAT)

- **Pilot interviews:** Conduct pilot sessions with colleagues acting as
  respondents.  Gather feedback on question clarity, agent tone and
  usability of the UI.  Iterate on prompt design and interface elements.
- **Admin workflows:** Have researchers use the dashboard to create goals,
  clarify them and approve scripts.  Identify friction points and improve
  the user experience.
- **Accessibility:** Test the respondent interface with assistive
  technologies (screen readers, keyboard navigation) to ensure
  inclusivity.

## 5. Regression testing

- After each change to prompts, model versions or infrastructure, re‑run
  the automated and integration tests.  Use Phoenix evaluation metrics to
  compare performance across iterations and ensure that improvements in
  one area do not degrade others.
