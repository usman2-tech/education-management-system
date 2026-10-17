"""
MODULE: AI Teacher Copilot Endpoints
PURPOSE:
Internal microservice routes providing pedagogical generation tools for teachers:
1. Lesson Plan Generator
2. Homework Generator
3. Quiz & Exam Generator
4. AI Grading Assistant
5. Student Performance Insights
6. Teaching Materials Generator

SECURITY:
Secured by internal service secret header verification.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from src.config.settings import settings
from src.workflows.teacher_copilot_workflow import teacher_copilot_workflow

router = APIRouter(prefix="/api/v1/copilot", tags=["Teacher Copilot"])


class CopilotBaseRequest(BaseModel):
    user_id: str
    school_id: Optional[str] = None
    role: str = "TEACHER"
    parameters: Dict[str, Any] = Field(default_factory=dict)


def _verify_secret(x_internal_secret: Optional[str]):
    if not x_internal_secret or x_internal_secret != settings.internal_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service secret.",
        )


@router.post("/lesson-plan")
async def generate_lesson_plan(
    payload: CopilotBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await teacher_copilot_workflow.generate_lesson_plan(payload.parameters)


@router.post("/homework")
async def generate_homework(
    payload: CopilotBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await teacher_copilot_workflow.generate_homework(payload.parameters)


@router.post("/exam")
async def generate_exam(
    payload: CopilotBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await teacher_copilot_workflow.generate_exam(payload.parameters)


@router.post("/grading")
async def generate_grading(
    payload: CopilotBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await teacher_copilot_workflow.generate_grading_suggestion(payload.parameters)


@router.post("/insights")
async def generate_insights(
    payload: CopilotBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await teacher_copilot_workflow.generate_performance_insights(payload.parameters)


@router.post("/teaching-materials")
async def generate_teaching_materials(
    payload: CopilotBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await teacher_copilot_workflow.generate_teaching_materials(payload.parameters)
