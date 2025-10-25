# Research overview for the AI‑interviewer hackathon project

This document collects current research (as of 23 October 2025) relevant to building
an AI‑powered interviewer that can conduct qualitative user interviews via voice,
generate open questions and follow‑ups, and derive psychological profiles from
conversations.  It draws on peer‑reviewed papers and industry analyses to
highlight how large language models and agentic systems can simulate human
behaviour, where these approaches excel, and where caution is warranted.

## 1. Digital twins, synthetic users and survey studies

Recent work on **digital twins**—LLM‑based simulacra of individual people—shows
that they can fill in missing survey data and back‑fill responses with high
accuracy.  A 2024 study by Kim & Lee finetuned a large language model on the
**General Social Survey**.  They found that digital twins could correctly
predict missing or skipped answers with about **78 % accuracy**, and their
aggregated responses correlated strongly with real human data (r≈0.98) when
back‑filling incomplete surveys【101249549851796†L80-L166】.  However, the twins were
less accurate (≈67 %) when asked to answer **new questions** not seen during
training【101249549851796†L141-L154】.  Interview‑based twins performed better than
those built only from demographic data, suggesting that rich interview data
improves realism【101249549851796†L80-L104】.  Bias remains a challenge: the twins
predicted responses of higher‑socioeconomic and white individuals more
accurately than those of marginalized groups【101249549851796†L170-L176】.

These findings imply that **contextualised prompts and rich interview
transcripts** are essential for realistic simulation.  Synthetic users that rely
only on demographics may capture **broad trends** but often mis‑estimate effect
magnitude and variability【101249549851796†L80-L104】.  The simplest and often
most effective method is to **augment LLM prompts with relevant interview data**
instead of extensive fine‑tuning【101249549851796†L80-L104】.  Our project should
therefore store interviews in a retrievable knowledge base and feed them back
into the model during question generation and summary.

## 2. Large language models as simulated economic and decision‑making agents

Horton (2023) argues that modern LLMs can act as **simulated economic agents**.
Because they are trained on vast human language corpora, they implicitly encode
preferences and heuristics—“homo *silicus*”.  Horton demonstrates that LLMs
can be endowed with information and endowments and then asked to play
experimental games.  In classical experiments (e.g., dictator and ultimatum
games), GPT‑3 produced **qualitatively similar behaviour** to human subjects and
allowed exploration of new variations【418136873531538†L60-L72】.  This work
highlights the potential of LLMs to model complex human decision‑making and
underscores the need to compare simulated outputs to empirical data.  It also
emphasises that simulation is easier than running physical experiments and can
yield quick insights into policy variations (e.g., hiring scenarios with
minimum‑wage constraints)【418136873531538†L60-L72】.

## 3. Generative agents: memory, planning and reflection

Park et al. (2023) introduce **generative agents**—computational agents built on
top of LLMs that simulate believable human behaviour in interactive
environments.  The architecture stores a **complete record of the agent’s
experiences**, synthesises these memories into higher‑level reflections and
retrieves them during planning【787293114600293†L60-L83】.  In the evaluation,
agents exhibited emergent social behaviours such as autonomously organising a
Valentine’s Day party and coordinating with other agents without explicit
instructions【787293114600293†L74-L80】.  An ablation study showed that the
components of **observation, planning and reflection** each contribute to the
believability of behaviour【787293114600293†L74-L80】.  For our project, this
suggests using agent architectures that maintain **short‑term memory** (the
current interview), **long‑term memory** (past interviews and user models) and
reflection mechanisms to refine future questions.

## 4. Multi‑modal interaction and embodied agents

The **Visual ChatGPT** project demonstrates that LLMs can be extended with
visual foundation models to handle images and multi‑step visual tasks【387876657731059†L50-L67】.
Although our hackathon tool focuses primarily on audio, the integration of
visual cues (e.g., an avatar’s facial expressions) could improve rapport.

**Voyager** introduces an LLM‑powered **embodied agent** that learns new skills
and explores an environment without human intervention【601764740103684†L62-L79】.
It uses an **automatic curriculum**, a **growing skill library**, and an
iterative prompting mechanism that incorporates environment feedback and
self‑verification【601764740103684†L62-L79】.  These techniques could inspire a
skill‑based system for generating interview questions and follow‑ups, where
different “skills” correspond to interviewing topics (intro, clarifications,
psychometric probes) and are composed based on feedback from the respondent.

## 5. Peer‑reviewed evidence for synthetic users

The Synthetic Users platform aggregates peer‑reviewed papers supporting the
notion that LLMs can simulate human responses.  Key findings include:

* **Interview‑based digital twins** outperform demographic‑only models, often
  achieving **85 % accuracy** when simulating responses in behavioural tasks
  after being trained on two‑hour voice‑enabled interviews【27589425414195†L40-L48】.
* **ICML 2025** researchers argue that LLMs already simulate human behaviour
  accurately enough for exploratory social science and identify five challenges:
  diversity, bias, sycophancy, alienness and generalisation【192090758259032†L33-L69】.
  They regard these as tractable engineering problems solvable with
  context‑rich prompts, fine‑tuning and iterative evaluation【192090758259032†L67-L69】.
* The **Centaur** model (Nature 2025) fine‑tuned a large language model on
  trial‑by‑trial behavioural data from 60 k participants and **outperformed
  traditional cognitive models**, generalised across tasks and showed internal
  representations aligned with fMRI activity【192090758259032†L73-L89】.
  This marks a turning point: synthetic users are now a **validated method** for
  pilot studies, counterfactual analysis and scaling social science【192090758259032†L97-L112】.

Further, a 2024 interactions‑magazine article notes that LLMs can assist
human‑centred design (HCD) by generating personas, identifying stakeholders and
simulating survey participants【799985222983487†L62-L79】.  However, it stresses
transparency and cautions that AI should **complement, not replace**, human
involvement【799985222983487†L62-L70】.  The authors warn that current models
struggle with emotive and social experiences【799985222983487†L117-L124】 and may
reproduce biases【799985222983487†L146-L152】; thus, rigorous prompting and bias
mitigation are required.

## 6. Conversational video agents

Beyond Presence offers a framework for **conversational video agents**.  Their
documentation explains that agents combine an LLM with real‑time audio/video
processing to create lifelike interactions【358105934166286†L71-L88】.  Video
agents provide deeper engagement by conveying **facial expressions and
personality**, building trust more quickly than voice‑only systems【358105934166286†L92-L100】.
The core components include a language model (reasoning engine), system prompts
(behaviour definitions), a knowledge base, speech‑to‑text (STT), text‑to‑speech
(TTS), turn detection and avatar rendering【358105934166286†L125-L176】.  Two
deployment options exist: a **managed service** hosted by Beyond Presence or a
self‑hosted stack using frameworks like **LiveKit**【358105934166286†L104-L121】.

For our hackathon, integrating a video avatar is optional; however, the
documentation clarifies that high‑quality avatars can improve engagement and
trust, which may be particularly valuable when discussing sensitive topics such
as flirting habits or financial behaviour.

## 7. Key takeaways for the project

1. **Context matters:** Synthetic users built from **rich interview data** are
   more accurate than those using demographics alone【101249549851796†L80-L104】.
   Our system should capture detailed answers and feed them back into the
   conversation context via retrieval‑augmented generation (RAG).
2. **Memory and reflection:** Generative agents maintain memories and perform
   reflective summarisation【787293114600293†L60-L83】.  Implementing a memory
   store (e.g., a vector database) and a reflection step will help the
   interviewer adapt questions based on prior responses.
3. **Bias and diversity:** Research highlights biases in digital twins and
   synthetic users【101249549851796†L94-L104】【192090758259032†L51-L69】.  Careful
   dataset selection, diverse prompts, and evaluation against real interviews are
   necessary to mitigate bias.  Transparency about the AI’s role is also
   essential【799985222983487†L108-L121】.
4. **Open questions and follow‑ups:** Effective interviewing requires open
   questions and psychological sensitivity.  Our agent should use prompt
   templates that avoid leading questions and should employ active listening to
   ask clarifications.
5. **Psychometric profiling:** The system can estimate personality traits (e.g.,
   Big Five/OCEAN) from conversation and produce visual profiles (radar
   charts).  Research suggests that combining emotional states with personality
   traits (“chain‑of‑feeling”) yields richer insights【27589425414195†L80-L87】.
6. **Modality:** Adding a video avatar (Beyond Presence) could improve rapport
   and trust【358105934166286†L92-L100】, though voice‑only interactions remain
   simpler to implement.

## 8. LLM observability and evaluation tools

As conversational agents transition from prototypes to production, observability
and evaluation become vital.  The **Phoenix** platform from Arize AI is an
open‑source tool designed to monitor and troubleshoot LLM applications.
Phoenix ingests **traces** via the OpenTelemetry protocol and is vendor‑ and
language‑agnostic【336324534843598†L110-L117】.  Its core modules include:

* **Tracing:** Phoenix records LLM calls, function executions and latencies,
  providing a timeline view of the agent’s decision‑making process【336324534843598†L110-L117】.
* **Evaluations:** It offers built‑in and third‑party evaluators (e.g., Ragas,
  Deepeval, Cleanlab) to score responses for relevance, toxicity and answer
  quality【336324534843598†L119-L133】.  A standalone evaluation library allows
  running LLM‑based tests on your own datasets【336324534843598†L119-L126】.
* **Datasets & experiments:** Phoenix enables creation of versioned datasets,
  experiments and prompt iteration, helping teams compare different
  configurations【336324534843598†L154-L162】.
* **Prompt playground and management:** Tools to store and replay prompts,
  compare model outputs and fine‑tune invocation parameters【336324534843598†L137-L149】.

Integrating Phoenix into the hackathon project will allow teams to observe
traces from the interviewer agents, benchmark the quality of generated
questions and answers, and iterate on prompt engineering.  It complements the
retrieval strategy (Weaviate) and ensures transparency and accountability in
AI‑mediated interviews.

The remaining design details, including technology choices, agentic framework
selection, and retrieval strategy, are described in the accompanying
`technical_design.md` document.
