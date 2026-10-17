"""
MODULE: AI Parent / Guardian Assistant Endpoints
PURPOSE:
Internal microservice routes providing personalized educational oversight tools for parents/guardians:
1. Child Academic Progress Summaries
2. Attendance Oversight & Trend Explanations
3. Homework & Assignment Briefings
4. Read-Only Fee & Tuition Balance Explanations
5. Age-Appropriate Home-Learning Suggestions
6. Child-Scoped Conversational Q&A

SECURITY:
Secured by internal service secret header verification.
Strictly scoped to authorized, verified linked children only.
Never modifies academic or financial records.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from src.config.settings import settings
from src.workflows.parent_assistant_workflow import parent_assistant_workflow

router = APIRouter(prefix="/api/v1/parent", tags=["Parent Assistant"])


class ParentBaseRequest(BaseModel):
    user_id: str
    school_id: Optional[str] = None
    role: str = "PARENT"
    parameters: Dict[str, Any] = Field(default_factory=dict)


def _verify_secret(x_internal_secret: Optional[str]):
    if not x_internal_secret or x_internal_secret != settings.internal_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service secret.",
        )


@router.post("/academic-summary")
async def generate_academic_summary(
    payload: ParentBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await parent_assistant_workflow.generate_academic_summary(payload.parameters)


@router.post("/attendance-summary")
async def generate_attendance_summary(
    payload: ParentBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await parent_assistant_workflow.generate_attendance_explanation(payload.parameters)


@router.post("/homework-summary")
async def generate_homework_summary(
    payload: ParentBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await parent_assistant_workflow.generate_homework_summary(payload.parameters)


@router.post("/fee-explanation")
async def generate_fee_explanation(
    payload: ParentBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await parent_assistant_workflow.generate_fee_explanation(payload.parameters)


@router.post("/home-learning")
async def generate_home_learning(
    payload: ParentBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await parent_assistant_workflow.generate_home_learning_suggestions(payload.parameters)


@router.post("/chat")
async def handle_parent_chat(
    payload: ParentBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await parent_assistant_workflow.handle_parent_chat(payload.parameters)
