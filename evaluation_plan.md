# Evaluation plan

This document outlines how to assess the quality and effectiveness of the
AI‑interview assistant.  It combines quantitative metrics from the Phoenix
platform with human‑subjective assessments to ensure the system meets
researcher needs and ethical standards.

## 1. Automated metrics

### 1.1 Phoenix evaluations

Phoenix provides built‑in LLM evaluators and supports integration with
third‑party libraries such as **Ragas**, **Deepeval** and **Cleanlab**【336324534843598†L119-L133】.  We propose the following metrics:

- **Answer relevance:** Does the respondent’s answer address the question?  Use
  a relevance evaluator that scores 0–1, where scores below 0.7 trigger a
  follow‑up or revision of the question.
- **Toxicity and safety:** Check whether the agent’s questions or the
  respondent’s answers contain harmful or offensive content.  Ensure the
  interviewer agent does not inadvertently lead the respondent into
  discomfort.【336324534843598†L119-L133】
- **Hallucination/faithfulness:** Compare summariser outputs against the
  original transcript to detect invented details.  Target a low false
  positive rate (<5 %).
- **Latency:** Measure the time between the end of a user utterance and the
  agent’s next response.  Aim for <1 second for a smooth conversation.

### 1.2 Conversational analytics

- **Completion rate:** Percentage of scheduled sessions that finish
  successfully without dropout.  Investigate reasons for dropout.
- **Average session length:** Compare planned length vs. actual duration.
- **Question coverage:** Did the agent ask all planned questions?  Count
  instances where optional follow‑ups were used.

## 2. Human evaluation

### 2.1 Interview quality

Recruit a panel of researchers to rate recorded sessions on:

- **Openness of questions:** Are questions neutral and open‑ended?  Avoid
  leading language.【101249549851796†L94-L104】
- **Empathy and tone:** Does the AI maintain a friendly and empathetic tone?
- **Follow‑up appropriateness:** Were follow‑ups relevant to the respondent’s
  previous answer?  Did they elicit deeper insights?
- **Psychometric plausibility:** Do the estimated personality traits
  correspond to the raters’ impressions?

### 2.2 Respondent experience

Collect optional feedback from participants via a post‑interview survey:

- **Comfort level:** Did the respondent feel at ease discussing the topic?
- **Clarity:** Were the questions easy to understand?
- **Trust and disclosure:** Was the respondent willing to share honest
  answers?  Did they trust that their data would be handled securely?
- **Suggestions:** Ask for suggestions to improve the experience.

## 3. Iteration and improvement

Use the metrics above to identify areas for improvement:

- Low relevance scores may indicate poorly worded questions; refine the
  script in the planner agent or adjust the RAG context.
- High toxicity or hallucination flags may require prompt tweaks or
  additional guardrails in the interviewer agent.
- Long latency times suggest infrastructure bottlenecks; consider
  scaling STT/TTS services or optimising the LLM call pattern.
- Negative human feedback should prompt a review of the conversation and
  updates to prompts or system behaviour.

Regularly re‑evaluate the system after each iteration to ensure
improvements are effective and do not introduce new issues.
