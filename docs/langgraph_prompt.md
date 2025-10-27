# LangGraph Implementation Prompt: Multi-Agent Interview System

## System Overview

You are building a multi-agent AI interview system using LangGraph to conduct qualitative research interviews. The system must orchestrate multiple specialized agents that work together to: clarify research goals, plan interviews, conduct live conversations, summarize responses, and generate psychometric profiles.

## Architecture Requirements

### Core Components
1. **Multi-Agent Orchestrator**: A LangGraph state machine that coordinates 5 specialized agents
2. **Memory System**: Dual-layer memory (short-term per session, long-term in Weaviate)
3. **RAG Pipeline**: Retrieval-augmented generation for context-aware responses
4. **Integration**: Beyond Presence API for audio/video streaming
5. **Observability**: Phoenix tracing for monitoring and evaluation

## State Graph Definition

Create a LangGraph `StateGraph` with the following structure:

```python
from typing import TypedDict, Annotated, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

# State Schema
class InterviewState(TypedDict):
    messages: Annotated[List[BaseMessage], lambda x, y: x + y]
    session_id: str
    current_agent: str
    research_goal: str
    clarified_goal: Dict[str, Any]
    interview_script: Dict[str, Any]
    current_question_index: int
    transcript: List[Dict[str, str]]
    summaries: List[str]
    psychometric_profile: Dict[str, Any]
    context_from_rag: List[str]
    agent_status: str  # "clarifying" | "planning" | "interviewing" | "summarizing" | "profiling" | "completed"
```

## Agent Implementations

### 1. Clarification Agent

**Purpose**: Gather essential information about the research goal before generating a script.

**System Prompt**:
```
You are a senior user-research strategist working for a product team conducting market and user research for possible product ideas such as new features on apps, software product market fit, user needs and pains for the new app. 

A researcher has provided a high-level goal. Your job is to ask a small number of clarification questions to ensure you understand:
- Target audience
- Specific behaviors or experiences to explore
- Sensitive topics to avoid
- Desired interview duration
- Depth and scope of research

Frame your questions neutrally and avoid making assumptions. Only ask essential questions. Once you have enough information to create a detailed brief, output a structured JSON with the following fields:
- clarifiedGoal: A refined, specific research goal
- targetAudience: Description of target participants
- keyTopics: List of main topics to explore (3-5 items)
- avoidTopics: Sensitive or off-limits topics
- suggestedDuration: Recommended interview length in minutes (5-20)

Do not generate an interview plan yet. Focus only on clarifying the research intent.
```

**Implementation**:
```python
def clarification_agent(state: InterviewState) -> InterviewState:
    """Ask follow-up questions until goal is clarified"""
    
    # Check if clarification is complete
    if "clarified_goal" in state and state.get("clarified_goal"):
        return {"agent_status": "planning", "current_agent": "planner"}
    
    # Get last message
    last_message = state["messages"][-1]
    
    # Use RAG to check for similar research goals
    similar_goals = retrieve_similar_goals(state["research_goal"])
    
    # Build prompt with context
    prompt = f"""Based on the research goal: "{state['research_goal']}"

Previous similar research: {format_similar_goals(similar_goals)}

Last message: {last_message.content}

Ask ONE clear question to clarify the goal, or if you have enough information, provide a structured JSON brief."""
    
    # Call LLM
    llm = ChatOpenAI(model="gpt-4", temperature=0.7)
    response = llm.invoke(prompt)
    
    # Try to parse JSON from response
    try:
        import json
        clarified = json.loads(response.content)
        # Store in Weaviate
        store_research_goal(state["session_id"], clarified)
        return {
            "clarified_goal": clarified,
            "messages": state["messages"] + [AIMessage(content=response.content)],
            "agent_status": "planning",
            "current_agent": "planner"
        }
    except:
        # Not JSON yet, continue asking questions
        return {
            "messages": state["messages"] + [AIMessage(content=response.content)],
            "agent_status": "clarifying"
        }
```

### 2. Interview Planner Agent

**Purpose**: Transform the clarified goal into a structured interview script.

**System Prompt**:
```
You are an expert qualitative researcher. Based on the clarified research goal, create an interview script with the following structure:

1. Introduction (2-3 sentences):
   - Who you are (AI interviewer)
   - Purpose of the study
   - Mention recording, privacy, and ability to pause
   - Thank the participant

2. Questions (5-10 open-ended questions):
   - Start with a broad opening question to establish context
   - Then dive into specific topics from the keyTopics list
   - Each question should encourage storytelling ("Can you describe...?", "Tell me about...")
   - Avoid yes/no questions
   - Sequence from general to specific

3. Follow-ups (2-3 for each main question):
   - Probe deeper if participant mentions something interesting
   - Examples: "Can you give me an example?", "What did that feel like?", "Tell me more about that"

4. Closing (1-2 sentences):
   - Thank the participant
   - Explain what happens next

Output format (JSON):
{
  "introduction": "...",
  "questions": [
    {
      "question": "...",
      "topic": "...",
      "order": 1,
      "followUps": ["...", "..."]
    }
  ],
  "closing": "...",
  "estimatedDuration": minutes
}

Limit total duration to the suggestedDuration. Keep questions concise and conversational.
```

**Implementation**:
```python
def planner_agent(state: InterviewState) -> InterviewState:
    """Generate interview script from clarified goal"""
    
    if "interview_script" in state and state.get("interview_script"):
        return {"agent_status": "interviewing", "current_agent": "interviewer"}
    
    # Retrieve similar interview plans from Weaviate
    similar_plans = retrieve_similar_plans(state["clarified_goal"]["keyTopics"])
    
    prompt = f"""Create an interview script based on this research brief:
{json.dumps(state['clarified_goal'], indent=2)}

Similar past interviews to avoid duplication:
{format_similar_plans(similar_plans)}

Generate a comprehensive interview script."""

    llm = ChatOpenAI(model="gpt-4", temperature=0.7, response_format={"type": "json_object"})
    response = llm.invoke(prompt)
    
    script = json.loads(response.content)
    
    # Store in Weaviate
    store_interview_script(state["session_id"], script)
    
    return {
        "interview_script": script,
        "messages": state["messages"] + [AIMessage(content="Interview script generated. Ready to begin.")],
        "agent_status": "interviewing",
        "current_agent": "interviewer",
        "current_question_index": 0
    }
```

### 3. Interviewer Agent

**Purpose**: Conduct the live interview conversation with the respondent.

**System Prompt**:
```
You are a friendly, non-judgmental AI interviewer conducting a qualitative research interview.

Guidelines:
1. Follow the approved interview script
2. Ask one question at a time
3. Use active listening cues ("I see", "That's interesting", "Tell me more")
4. After each answer, decide whether to:
   - Ask a follow-up question (if the answer mentions something intriguing)
   - Move to the next main question (if the answer is sufficient)
   - Clarify something (if the answer is unclear)
5. Never share opinions or advice
6. Respect pauses and don't interrupt
7. If the respondent goes off-topic but shares something relevant, explore it briefly
8. Maintain a warm, empathetic tone

Current script: {script}
Previous questions asked: {previous_questions}
Current question index: {index}

Based on the participant's last answer, decide your next action. Return JSON:
{
  "action": "ask_followup" | "move_to_next" | "clarify" | "end_interview",
  "content": "Your response text",
  "reason": "Brief reason for this action",
  "questionId": "optional question ID"
}
```

**Implementation**:
```python
def interviewer_agent(state: InterviewState) -> InterviewState:
    """Conduct the interview conversation"""
    
    script = state["interview_script"]
    current_index = state["current_question_index"]
    transcript = state.get("transcript", [])
    summaries = state.get("summaries", [])
    
    # Get last participant message
    last_message = transcript[-1] if transcript else None
    
    # RAG: Retrieve similar past answers to avoid repetition
    context_from_rag = []
    if last_message:
        context_from_rag = retrieve_similar_answers(last_message["content"], state["session_id"])
    
    # Build context-aware prompt
    context = f"""Previous summaries: {summaries[-3:] if summaries else "None"}

Similar past responses to reference:
{context_from_rag}

Current question from script: {script['questions'][current_index] if current_index < len(script['questions']) else "Interview complete"}"""

    # Determine next action
    prompt = f"""You are conducting a research interview. {context}
    
Last participant message: {last_message['content'] if last_message else 'None (start of interview)'}
    
Choose your next action and provide your response."""

    llm = ChatOpenAI(model="gpt-4", temperature=0.7, response_format={"type": "json_object"})
    response = llm.invoke(prompt)
    
    action_data = json.loads(response.content)
    
    # Update state based on action
    new_index = current_index
    if action_data["action"] == "move_to_next":
        new_index += 1
    
    new_transcript = transcript + [
        {"speaker": "ai", "content": action_data["content"], "timestamp": datetime.now().isoformat()}
    ]
    
    return {
        "transcript": new_transcript,
        "context_from_rag": context_from_rag,
        "current_question_index": new_index,
        "agent_status": "summarizing" if last_message else "interviewing"
    }
```

### 4. Summarizer Agent

**Purpose**: Compress each answer into concise summaries for memory management.

**System Prompt**:
```
You are a summarization agent. After each participant answer, create a concise summary that:
1. Captures key themes and insights (2-3 sentences max)
2. Notes any emotional tone or sentiment
3. Highlights important details for follow-up
4. Extracts topic tags

Be neutral and factual. Do not infer motivations unless explicitly stated.

Output JSON:
{
  "summary": "Brief summary text",
  "keyPoints": ["point1", "point2"],
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "tags": ["tag1", "tag2"]
}
```

**Implementation**:
```python
def summarizer_agent(state: InterviewState) -> InterviewState:
    """Summarize the latest participant answer"""
    
    # Get last participant message
    transcript = state.get("transcript", [])
    participant_messages = [t for t in transcript if t["speaker"] == "participant"]
    
    if not participant_messages:
        return {"agent_status": "interviewing"}
    
    last_answer = participant_messages[-1]["content"]
    
    prompt = f"""Summarize this participant answer in context of the research goal:
{state.get('research_goal', 'Unknown')}

Answer to summarize: {last_answer}

Generate a concise summary."""

    llm = ChatOpenAI(model="gpt-4", temperature=0.3, response_format={"type": "json_object"})
    response = llm.invoke(prompt)
    
    summary_data = json.loads(response.content)
    
    # Store summary in Weaviate for long-term memory
    store_summary(state["session_id"], last_answer, summary_data)
    
    # Update summaries (keep last 5)
    summaries = state.get("summaries", []) + [summary_data["summary"]]
    
    return {
        "summaries": summaries[-5:],
        "agent_status": "interviewing"
    }
```

### 5. Psychometric Agent

**Purpose**: Analyze the full conversation to estimate personality traits.

**System Prompt**:
```
You are a psychologist analyzing a research interview to estimate personality traits.

Based on the complete conversation transcript, estimate the participant's Big Five personality traits on a 0-100 scale:
- Openness: Curiosity, creativity, willingness to try new things
- Conscientiousness: Organization, self-discipline, reliability
- Extraversion: Sociability, assertiveness, emotional expressiveness
- Agreeableness: Trust, altruism, kindness, cooperation
- Neuroticism: Anxiety, moodiness, emotional instability

Also estimate Enneagram type (1-9) if possible.

Output JSON:
{
  "bigFive": {
    "openness": number,
    "conscientiousness": number,
    "extraversion": number,
    "agreeableness": number,
    "neuroticism": number
  },
  "enneagram": {
    "type": number,
    "confidence": number,
    "description": "brief explanation"
  },
  "reasoning": "overall analysis paragraph"
}
```

**Implementation**:
```python
def psychometric_agent(state: InterviewState) -> InterviewState:
    """Generate psychometric profile"""
    
    # Concatenate full transcript
    transcript = state.get("transcript", [])
    full_text = "\n".join([f"{t['speaker']}: {t['content']}" for t in transcript])
    
    prompt = f"""Analyze this complete interview transcript for personality traits:

{full_text}

Provide a psychometric analysis."""

    llm = ChatOpenAI(model="gpt-4", temperature=0.3, response_format={"type": "json_object"})
    response = llm.invoke(prompt)
    
    profile = json.loads(response.content)
    
    # Store in Weaviate
    store_psychometric_profile(state["session_id"], profile)
    
    return {
        "psychometric_profile": profile,
        "agent_status": "completed"
    }
```

## Graph Construction

```python
# Build the state graph
workflow = StateGraph(InterviewState)

# Add nodes for each agent
workflow.add_node("clarifier", clarification_agent)
workflow.add_node("planner", planner_agent)
workflow.add_node("interviewer", interviewer_agent)
workflow.add_node("summarizer", summarizer_agent)
workflow.add_node("psychometric", psychometric_agent)

# Define edges
workflow.set_entry_point("clarifier")

workflow.add_conditional_edges(
    "clarifier",
    route_by_agent_status,
    {
        "clarifying": "clarifier",
        "planning": "planner",
        "interviewing": "interviewer"
    }
)

workflow.add_conditional_edges(
    "planner",
    lambda x: "interviewing" if x.get("interview_script") else "planner",
    {
        "interviewing": "interviewer"
    }
)

workflow.add_conditional_edges(
    "interviewer",
    route_interviewer_to_next,
    {
        "summarizing": "summarizer",
        "interviewing": "interviewer",
        "profiling": "psychometric",
        "completed": END
    }
)

workflow.add_edge("summarizer", "interviewer")
workflow.add_edge("psychometric", END)

# Compile graph
app = workflow.compile()
```

## Helper Functions

```python
def retrieve_similar_goals(goal: str) -> List[Dict]:
    """RAG: Retrieve similar research goals from Weaviate"""
    # Implement Weaviate query
    pass

def route_by_agent_status(state: InterviewState) -> str:
    """Route based on agent_status field"""
    return state.get("agent_status", "clarifying")

def route_interviewer_to_next(state: InterviewState) -> str:
    """Determine next step after interviewer"""
    script = state.get("interview_script", {})
    current_idx = state.get("current_question_index", 0)
    
    if current_idx >= len(script.get("questions", [])):
        return "profiling"
    
    if state.get("agent_status") == "summarizing":
        return "summarizing"
    
    return "interviewing"

def store_research_goal(session_id: str, data: Dict):
    """Store in Weaviate"""
    pass

def store_interview_script(session_id: str, script: Dict):
    """Store in Weaviate"""
    pass

def store_summary(session_id: str, answer: str, summary: Dict):
    """Store summary in Weaviate"""
    pass

def store_psychometric_profile(session_id: str, profile: Dict):
    """Store in Weaviate"""
    pass

def retrieve_similar_plans(topics: List[str]) -> List[Dict]:
    """RAG: Retrieve similar interview plans"""
    pass

def retrieve_similar_answers(answer: str, session_id: str) -> List[str]:
    """RAG: Retrieve similar past answers"""
    pass
```

## Usage Example

```python
# Initialize state
initial_state = InterviewState(
    messages=[],
    session_id="session_123",
    current_agent="clarifier",
    research_goal="Discover user habits for a running app",
    clarified_goal=None,
    interview_script=None,
    current_question_index=0,
    transcript=[],
    summaries=[],
    psychometric_profile=None,
    context_from_rag=[],
    agent_status="clarifying"
)

# Run the graph
for chunk in app.stream(initial_state):
    print(f"Agent: {chunk.get('current_agent')}")
    print(f"Status: {chunk.get('agent_status')}")
    if chunk.get("messages"):
        print(f"Latest message: {chunk['messages'][-1].content[:100]}...")
```

## Integration with Beyond Presence

```python
async def handle_beyond_presence_message(message: str, session_id: str):
    """Process incoming message from Beyond Presence"""
    
    # Update transcript
    # Trigger interviewer agent via LangGraph
    
    # Get LLM response
    # Send to Beyond Presence for rendering
    pass
```

## Requirements

- **LangGraph**: For state machine orchestration
- **LangChain**: For LLM integration and memory management
- **Weaviate**: For vector storage and RAG
- **Phoenix**: For observability and evaluation
- **OpenAI GPT-4**: As the primary LLM
- **Beyond Presence**: For audio/video streaming

## Key Features

1. **State-driven**: Each agent receives and updates the shared state
2. **Conditional routing**: Dynamic navigation based on interview progress
3. **Memory management**: Dual-layer memory with summarization
4. **RAG integration**: Context-aware responses using Weaviate
5. **Modular**: Each agent is independently testable
6. **Observable**: Phoenix tracing for debugging and evaluation


