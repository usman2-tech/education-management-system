"""
MODULE: AI Microservice Chat Endpoints
PURPOSE:
Internal service-to-service endpoints for conversational execution and health inspection.

SECURITY:
Secured by x-internal-secret header verification.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from src.config.settings import settings
from src.workflows.academic_agent import academic_workflow
from src.agents.gemini_adapter import gemini_adapter

router = APIRouter(prefix="/api/v1", tags=["AI Chat"])


class MessagePayload(BaseModel):
    sender: str
    content: str


class ContextPayload(BaseModel):
    user_id: str
    role: str
    school_id: Optional[str] = None


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    messages: List[MessagePayload] = Field(default_factory=list)
    context: ContextPayload


class ChatResponse(BaseModel):
    conversation_id: Optional[str] = None
    response: str
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    tokens_used: int
    model_name: str
    is_live: bool


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    payload: ChatRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    if not x_internal_secret or x_internal_secret != settings.internal_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service secret.",
        )

    last_message = payload.messages[-1].content if payload.messages else ""
    if not last_message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Last message content cannot be empty.",
        )

    context_dict = {
        "user_id": payload.context.user_id,
        "role": payload.context.role,
        "school_id": payload.context.school_id,
    }

    result = await academic_workflow.execute(
        prompt=last_message,
        messages=[{"sender": m.sender, "content": m.content} for m in payload.messages],
        context=context_dict,
    )

    return ChatResponse(
        conversation_id=payload.conversation_id,
        response=result["response"],
        tool_calls=result.get("tool_calls", []),
        tools_used=result.get("tools_used", []),
        tokens_used=result.get("tokens_used", 0),
        model_name=result.get("model_name", settings.gemini_model),
        is_live=result.get("is_live", False),
    )


@router.get("/status")
async def ai_status(
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "gemini_model": settings.gemini_model,
        "gemini_api_key_configured": bool(settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here"),
        "is_live_gemini": gemini_adapter.is_live,
        "mock_fallback_enabled": settings.ai_mock_fallback,
    }
