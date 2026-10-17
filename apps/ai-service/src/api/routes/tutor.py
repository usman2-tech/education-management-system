"""
MODULE: AI Student Tutor Endpoints
PURPOSE:
Internal microservice routes providing personalized tutoring tools for students:
1. Concept Explanations
2. Interactive Step-by-Step Socratic Tutoring
3. Practice Quiz Generator
4. Practice Quiz Formative Evaluator
5. Personalized Revision Planner
6. Homework Guidance (pedagogical hints and analogies)
7. Student Learning Progress Insights

SECURITY:
Secured by internal service secret header verification.
Formative practice data never alters official academic records.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from src.config.settings import settings
from src.workflows.student_tutor_workflow import student_tutor_workflow

router = APIRouter(prefix="/api/v1/tutor", tags=["Student Tutor"])


class TutorBaseRequest(BaseModel):
    user_id: str
    school_id: Optional[str] = None
    role: str = "STUDENT"
    parameters: Dict[str, Any] = Field(default_factory=dict)


def _verify_secret(x_internal_secret: Optional[str]):
    if not x_internal_secret or x_internal_secret != settings.internal_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service secret.",
        )


@router.post("/concept-explanation")
async def generate_concept_explanation(
    payload: TutorBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await student_tutor_workflow.generate_concept_explanation(payload.parameters)


@router.post("/socratic")
async def socratic_tutoring(
    payload: TutorBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await student_tutor_workflow.socratic_tutoring(payload.parameters)


@router.post("/practice-quiz")
async def generate_practice_quiz(
    payload: TutorBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await student_tutor_workflow.generate_practice_quiz(payload.parameters)


@router.post("/evaluate-quiz")
async def evaluate_quiz(
    payload: TutorBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await student_tutor_workflow.evaluate_practice_quiz(payload.parameters)


@router.post("/revision-plan")
async def generate_revision_plan(
    payload: TutorBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await student_tutor_workflow.generate_revision_plan(payload.parameters)


@router.post("/homework-guidance")
async def generate_homework_guidance(
    payload: TutorBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await student_tutor_workflow.generate_homework_guidance(payload.parameters)


@router.post("/learning-progress")
async def generate_learning_progress(
    payload: TutorBaseRequest,
    x_internal_secret: Optional[str] = Header(None, alias="x-internal-secret"),
):
    _verify_secret(x_internal_secret)
    return await student_tutor_workflow.generate_learning_progress(payload.parameters)
