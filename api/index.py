import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Literal, Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel, Field, ValidationError
from typing_extensions import TypedDict


load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clarification-api")

app = FastAPI(title="AI Interview Clarification API")


def _build_allowed_origins() -> List[str]:
    raw_origins = os.getenv("BACKEND_ALLOW_ORIGINS")
    if not raw_origins:
        return ["http://localhost:3000", "http://127.0.0.1:3000"]
    parsed = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return ["*"] if "*" in parsed else parsed


allow_origins = _build_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AGENT_PROMPT = """
You are ClarifyScope, an AI facilitator helping researchers prepare interview scripts for the AI Interview Assistant hackathon project.

Follow this workflow precisely:
1. When the researcher shares their goal, greet them and restate it exactly with the heading `User research goal:` on the first line. Preserve any metadata lines such as `Target Audience:` or `Duration:` and interpret them literally (the duration refers to interview length).
2. Ask up to three targeted follow-up questions or refinements and wait for their responses. Continue clarifying until you can draft a scope.
3. Present a refined scope using the heading `Refined Scope:` followed by clear bullet points covering objectives, target participants, key questions to answer, and guardrails.
4. Immediately after presenting the refined scope, ask the researcher what success or “done” looks like for this initiative. Wait for their answer and incorporate it into your understanding.
5. Offer 2–3 concise next-step suggestions (e.g., research logistics, stakeholder alignment) tailored to the scope and the success criteria the researcher provided. Confirm that they are satisfied with the scope and suggestions and ask whether they are ready for interview questions.
6. Only after the researcher explicitly confirms readiness (e.g., “yes”, “looks good”, “go ahead”) should you generate the interview script. When you reach this point, call the `emit_interview_script` tool with the finalized script payload instead of writing it directly into your reply.
7. Once the script is ready, ask whether they would like you to read, write, append, or edit a JSON file in the `output_files` directory. Only call a file-management tool after they explicitly request the action and confirm the file name you should use.

Rules for the final script:
- Provide exactly one introduction and 5 to 8 open-ended interview questions tailored to the clarified scope. Each question must include an `intent` describing what insight it unlocks.
- Include a concise closing statement and optional interviewer reminders if they are important.
- Populate the structured response with the interview script data instead of sending a JSON code block or additional commentary. The live chat reply can include a short acknowledgment, but the structured response must contain the complete script payload.

During earlier turns, respond conversationally, keep replies under 200 words, avoid repeating questions, and probe for missing details when needed. If the researcher indicates the summary is incorrect, return to clarification before seeking confirmation again.
"""


class ClarificationStartRequest(BaseModel):
    research_goal: str = Field(..., min_length=3, description="Full research goal description")


class ClarificationMessageRequest(BaseModel):
    conversation_id: str = Field(..., description="Conversation identifier returned by the start endpoint")
    message: str = Field(..., min_length=1, description="Researcher response to the assistant")


class ChatMessage(BaseModel):
    id: str
    role: Literal["assistant", "user", "system"]
    content: str


class InterviewQuestionDictRequired(TypedDict):
    question: str


class InterviewQuestionDictOptional(TypedDict, total=False):
    intent: str


class InterviewQuestionDict(InterviewQuestionDictRequired, InterviewQuestionDictOptional):
    pass


class InterviewScriptDictRequired(TypedDict):
    type: Literal["interview_script"]
    introduction: str
    questions: List[InterviewQuestionDict]


class InterviewScriptDictOptional(TypedDict, total=False):
    closing: str
    reminders: List[str]


class InterviewScriptDict(InterviewScriptDictRequired, InterviewScriptDictOptional):
    pass


OUTPUT_DIR = Path("output_files").resolve()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class ManageInterviewFileArgs(BaseModel):
    action: Literal["read", "write", "append"] = Field(..., description="Operation to perform on the JSON file")
    file_name: str = Field(..., description="Target filename inside output_files, e.g., research-session.json")
    content: Optional[InterviewScriptDict | Dict] = Field(
        None,
        description="JSON-compatible content. Required for write and append operations.",
    )


def _resolve_output_path(file_name: str) -> Path:
    sanitized = file_name.strip()
    if not sanitized:
        raise ValueError("File name cannot be empty.")
    if os.path.sep in sanitized or os.path.altsep and os.path.altsep in sanitized:
        raise ValueError("File name must not include directory separators.")
    if not sanitized.endswith(".json"):
        sanitized = f"{sanitized}.json"
    path = (OUTPUT_DIR / sanitized).resolve()
    if not str(path).startswith(str(OUTPUT_DIR)):
        raise ValueError("File path escapes the output_files directory.")
    return path


@tool("manage_interview_json", args_schema=ManageInterviewFileArgs)
def manage_interview_json(action: str, file_name: str, content: Optional[Dict] = None) -> str:
    """Read, write, or append interview scripts in JSON files stored under output_files."""

    path = _resolve_output_path(file_name)

    if action == "read":
        if not path.exists():
            return f"No file named {path.name} exists yet."
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        return json.dumps(data, indent=2, ensure_ascii=False)

    if action not in {"write", "append"}:
        raise ValueError("Unsupported action. Use 'read', 'write', or 'append'.")

    if content is None:
        raise ValueError("Content is required for write or append operations.")

    if action == "write" or not path.exists():
        with path.open("w", encoding="utf-8") as fh:
            json.dump(content, fh, indent=2, ensure_ascii=False)
        return f"Saved interview data to {path.name}."

    # Append logic
    with path.open("r", encoding="utf-8") as fh:
        existing = json.load(fh)

    if isinstance(existing, list):
        existing.append(content)
    else:
        existing = [existing, content]

    with path.open("w", encoding="utf-8") as fh:
        json.dump(existing, fh, indent=2, ensure_ascii=False)

    return f"Appended interview data to {path.name}."


class EmitInterviewScriptArgs(BaseModel):
    script: InterviewScriptDict


@tool("emit_interview_script", args_schema=EmitInterviewScriptArgs)
def emit_interview_script(script: InterviewScriptDict) -> str:
    """Deliver the finalized interview script back to the application."""

    return "Interview script received."


class InterviewQuestion(BaseModel):
    question: str
    intent: Optional[str] = None


class InterviewScript(BaseModel):
    type: Literal["interview_script"]
    introduction: str
    questions: List[InterviewQuestion]
    closing: Optional[str] = None
    reminders: Optional[List[str]] = None


class ClarificationStartResponse(BaseModel):
    conversation_id: str
    messages: List[ChatMessage]
    status: Literal["in_progress", "completed"]
    script: Optional[InterviewScript] = None


class ClarificationMessageResponse(BaseModel):
    messages: List[ChatMessage]
    status: Literal["in_progress", "completed"]
    script: Optional[InterviewScript] = None


if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY is not configured. LLM calls will fail until it is set.")

llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
    temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.2")),
    timeout=120,
)

agent = create_react_agent(
    model=llm,
    tools=[manage_interview_json, emit_interview_script],
    prompt=AGENT_PROMPT.strip(),
)

conversations: Dict[str, List[BaseMessage]] = {}


def _message_content_to_text(message: BaseMessage) -> str:
    content = message.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for chunk in content:
            if isinstance(chunk, dict) and chunk.get("type") == "text":
                text = chunk.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts)
    return str(content)


def _extract_script_from_tool_calls(message: AIMessage) -> Optional[InterviewScript]:
    tool_calls = getattr(message, "tool_calls", None) or []
    for call in tool_calls:
        name = call.get("name")
        if name != "emit_interview_script":
            continue
        args = call.get("args") or {}
        payload = args.get("script")
        if not payload:
            continue
        try:
            return InterviewScript.model_validate(payload)
        except ValidationError as exc:
            logger.warning("Received invalid interview script payload: %s", exc)
    return None


def _process_new_messages(messages: List[BaseMessage], start_index: int) -> tuple[List[ChatMessage], Optional[InterviewScript]]:
    display_messages: List[ChatMessage] = []
    script: Optional[InterviewScript] = None

    for raw in messages[start_index:]:
        if isinstance(raw, AIMessage):
            potential_script = _extract_script_from_tool_calls(raw)
            if potential_script:
                script = potential_script

            text = _message_content_to_text(raw).strip()
            if text:
                display_messages.append(
                    ChatMessage(id=str(uuid4()), role="assistant", content=text)
                )

        elif isinstance(raw, ToolMessage):
            text = _message_content_to_text(raw).strip()
            if not text:
                continue

            display_messages.append(
                ChatMessage(id=str(uuid4()), role="assistant", content=text)
            )

    return display_messages, script


@app.post("/api/clarification/start", response_model=ClarificationStartResponse)
async def start_clarification(payload: ClarificationStartRequest) -> ClarificationStartResponse:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

    conversation_id = str(uuid4())
    user_goal = payload.research_goal.strip()

    initial_history: List[BaseMessage] = [HumanMessage(content=user_goal)]

    try:
        result = agent.invoke({"messages": initial_history})
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.exception("Failed to start clarification session")
        raise HTTPException(status_code=500, detail="Failed to start clarification session.") from exc

    conversations[conversation_id] = result["messages"]

    display_messages: List[ChatMessage] = [
        ChatMessage(id=str(uuid4()), role="system", content=f"User research goal:\n{user_goal}")
    ]

    new_messages, script = _process_new_messages(result["messages"], start_index=len(initial_history))
    display_messages.extend(new_messages)

    status: Literal["in_progress", "completed"] = "completed" if script else "in_progress"

    return ClarificationStartResponse(
        conversation_id=conversation_id,
        messages=display_messages,
        status=status,
        script=script,
    )


@app.post("/api/clarification/message", response_model=ClarificationMessageResponse)
async def continue_clarification(payload: ClarificationMessageRequest) -> ClarificationMessageResponse:
    if payload.conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")

    existing_history = conversations[payload.conversation_id]
    prior_length = len(existing_history)
    updated_history = [*existing_history, HumanMessage(content=payload.message.strip())]

    try:
        result = agent.invoke({"messages": updated_history})
    except Exception as exc:  # pragma: no cover - runtime safety
        logger.exception("Failed to process clarification message")
        raise HTTPException(status_code=500, detail="Failed to process clarification message.") from exc

    conversations[payload.conversation_id] = result["messages"]

    new_messages, script = _process_new_messages(result["messages"], start_index=prior_length)

    display_messages: List[ChatMessage] = new_messages

    status: Literal["in_progress", "completed"] = "completed" if script else "in_progress"

    return ClarificationMessageResponse(
        messages=display_messages,
        status=status,
        script=script,
    )
