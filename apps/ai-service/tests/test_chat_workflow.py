"""
Automated unit & integration tests for AI Chat and Gemini Adapter.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.config.settings import settings
from src.agents.gemini_adapter import gemini_adapter
from src.workflows.academic_agent import academic_workflow


@pytest.mark.asyncio
async def test_ai_status_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/status")
        assert response.status_code == 200
        data = response.json()
        assert "gemini_model" in data
        assert "is_live_gemini" in data
        assert "mock_fallback_enabled" in data


@pytest.mark.asyncio
async def test_chat_unauthorized_without_secret():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/chat",
            json={
                "messages": [{"sender": "USER", "content": "Hello"}],
                "context": {"user_id": "test-user-1", "role": "STUDENT"},
            },
        )
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_chat_authorized_student_request():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/chat",
            headers={"x-internal-secret": settings.internal_secret},
            json={
                "messages": [{"sender": "USER", "content": "What is my attendance rate this term?"}],
                "context": {
                    "user_id": "student-123",
                    "role": "STUDENT",
                    "school_id": "school-abc",
                },
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
        assert "tools_used" in data
        assert "get_attendance_summary" in data["tools_used"]
        assert "tokens_used" in data
        assert "model_name" in data


@pytest.mark.asyncio
async def test_chat_teacher_forbidden_from_fees():
    """Verify tool selector blocks teachers from querying fee records"""
    tool = academic_workflow._select_tool("What are the outstanding fees for students?", "TEACHER")
    assert tool != "get_fee_summary"


@pytest.mark.asyncio
async def test_adapter_mock_fallback_deterministic():
    res = gemini_adapter._generate_mock_response(
        prompt="Tell me about homework",
        system_instruction="You are a helpful assistant",
        context_data={"total_homework": 3, "pending": 1},
    )
    assert "text" in res
    assert "Total homework" in res["text"] or "pending" in res["text"].lower()
    assert res["tokens_used"] > 0

