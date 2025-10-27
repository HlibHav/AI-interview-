# Privacy and ethics guidelines

This document outlines how the AI‑interview assistant collects, stores and
uses data, and how it adheres to ethical principles.  It is intended to help
researchers design studies that respect participant autonomy and comply with
relevant regulations (e.g., GDPR).

## 1. Informed consent

- **Clear disclosure:** At the start of each interview, the AI must inform
  respondents that the conversation is recorded for research purposes and
  summarised by automated tools.  They must be told how their data will be
  used and stored, and that they can withdraw at any time.
- **Right to withdraw:** Respondents can pause or stop the interview at any
  time.  If they withdraw, their recordings and transcripts should be
  deleted or excluded from analysis.
- **Voluntary participation:** Participation is voluntary; no coercion or
  incentives that could compromise voluntary consent should be used.

## 2. Data handling and retention

- **Anonymisation:** Remove personally identifiable information (PII) from
  transcripts and metadata before storing them in Weaviate.  Use a unique
  session ID instead of names or emails.
- **Access control:** Limit access to raw audio and transcripts to
  authorised researchers.  Phoenix traces should not contain sensitive
  content beyond technical metadata.  Consider using Phoenix’s data
  retention settings【336324534843598†L119-L133】.
- **Retention period:** Define a reasonable retention period (e.g., 12
  months) after which data will be deleted or archived.  Inform
  participants of this policy.
- **Encryption:** Encrypt data at rest (e.g., using TLS for Weaviate and
  Phoenix connections) and in transit.

## 3. Bias and fairness

- **Diverse datasets:** Use diverse seed datasets when training or
  fine‑tuning LLMs to mitigate biases.  Research shows that digital twins
  built only on demographics can misestimate responses and amplify
  disparities【101249549851796†L80-L104】.  Provide rich context to the agent to
  reduce stereotypes.
- **Evaluation across groups:** When analysing results, compare how the
  agent performs across demographics.  Adjust prompts or evaluation
  thresholds if certain groups receive lower relevance scores or less
  empathetic responses.
- **Transparency:** Inform participants that an AI is conducting the
  interview and that it may have limitations.  Include a disclaimer
  regarding possible biases and the steps taken to mitigate them.

## 4. Psychological harm

- **Sensitive topics:** If the research goal involves sensitive issues
  (e.g., flirting habits or financial behaviour), ensure that questions are
  phrased neutrally and allow respondents to skip any question they find
  uncomfortable.  Avoid probing further if the respondent exhibits
  discomfort.【101249549851796†L94-L104】
- **Referral resources:** Provide links to support resources (e.g., mental
  health services) after interviews that touch on potentially distressing
  topics.

## 5. Accountability and auditability

- **Audit trails:** Keep audit logs of model prompts, outputs and system
  decisions.  Phoenix traces provide a technical record of function calls
  and model interactions【336324534843598†L110-L117】.
- **Human oversight:** Researchers should review transcripts and summarised
  outputs periodically.  Critical decisions (e.g., concluding a sensitive
  interview early) should remain under human control.
- **Continuous improvement:** Regularly re‑evaluate models for bias and
  fairness, and adjust training data or prompts accordingly.  Document
  changes and their rationale.
