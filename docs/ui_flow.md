# User interface flows

This document describes the main user flows for both **admins** (researchers)
and **respondents**.  It outlines the pages, interactions and data passed
between the front end and back end.  These flows can be used as a basis for
wireframes or implementation.

## 1. Admin flow

1. **Dashboard home**
   - Presents a form to enter the *research goal* and optional parameters
     (target audience, duration, sensitivity).  A “Start” button submits
     the goal.
2. **Clarification chat**
   - Displays a chat‑like interface where the clarification agent asks
     follow‑up questions.  The admin types answers.  Messages are stored
     and visible in the history.
   - When the agent has sufficient information, it notifies the admin and
     transitions to the planning stage.
3. **Script editor**
   - Shows a draft interview plan in a structured format (introduction,
     questions, follow‑ups).  Admins can edit text, add or remove
     questions and reorder items.
   - Buttons: **Regenerate** (ask the planner agent to refine the plan based
     on changes), **Approve** (finalise the script) or **Cancel**.
4. **Session list**
   - After approval, the system generates a unique link for the session
     (`/session/{sessionId}`).  The admin sees a table of scheduled
     interviews with statuses (pending, in progress, completed).
5. **Results and analytics**
   - For completed sessions, the admin can view transcripts, summaries,
     psychometric radar charts and Phoenix evaluation metrics (e.g., answer
     relevance scores).  Filters allow grouping responses by theme or
     demographic.

## 2. Respondent flow

1. **Landing page**
   - When a respondent visits their unique link, they see a simple page
     explaining the study and requesting microphone (and optionally
     camera) permission.  They enter their email (optional) and click
     **Start interview**.
2. **Interview session**
   - The interviewer agent greets the respondent via audio (and video if
     enabled) and asks the first question.  The page displays a waveform
     animation or avatar while the user speaks.
   - The user can click **Pause** to stop the interview temporarily.  The
     agent politely acknowledges and waits for **Resume**.
   - Visual indicators show progress (e.g., question number) and a timer.
3. **Completion**
   - After the final question, the agent thanks the respondent and ends the
     call.  A confirmation screen appears, optionally asking for
     demographic information or feedback about the interview experience.

## 3. Data exchange

- The front end streams audio via WebRTC to the back end.  It receives TTS
  audio (and video frames) via the same channel.  For fallback or low
  connectivity, HTTP streaming is available.
- All chat messages, plan drafts and summaries are retrieved via REST APIs.
- Phoenix trace IDs may be displayed for debugging but are hidden from
  respondents.
