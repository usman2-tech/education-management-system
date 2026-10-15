"""
MODULE: Role-Aware Academic Assistant Workflow
PURPOSE:
Orchestrates conversational processing using Google Gemini and scoped live EMS data tools.
Enforces strict institutional safety directives, role-tailored reasoning, and zero data fabrication.

SECURITY:
Never trusts client-supplied permissions. Enforces NestJS as the sole authority.
Never allows prompt injection to bypass role or school boundaries.
"""

import logging
from typing import Dict, Any, List, Optional
from src.agents.gemini_adapter import gemini_adapter
from src.tools.ems_client import ems_client

logger = logging.getLogger("ems-academic-workflow")


class AcademicAgentWorkflow:
    def __init__(self):
        self.gemini = gemini_adapter
        self.ems = ems_client

    async def execute(
        self,
        prompt: str,
        messages: List[Dict[str, str]],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Executes the role-aware conversational workflow.
        """
        user_id = context.get("user_id")
        role = context.get("role", "STUDENT")
        school_id = context.get("school_id")

        logger.info(f"Running AcademicAgentWorkflow for role={role} user={user_id}")

        # 1. Construct role-tailored system instructions
        system_instruction = self._build_system_instruction(role)

        # 2. Determine necessary read-only EMS tool
        tool_name = self._select_tool(prompt, role)
        tool_result = None
        tool_calls = []
        tools_used = []

        if tool_name:
            tool_res = await self.ems.execute_tool(
                tool_name=tool_name,
                user_id=user_id,
                role=role,
                school_id=school_id,
                args={},
            )
            tools_used.append(tool_name)
            tool_calls.append({
                "name": tool_name,
                "success": tool_res.get("success", False),
                "records": 1 if tool_res.get("data") else 0,
            })
            if tool_res.get("success"):
                tool_result = tool_res.get("data")

        # 3. Generate response using Google Gemini adapter
        gemini_result = await self.gemini.generate_response(
            prompt=prompt,
            system_instruction=system_instruction,
            context_data=tool_result,
            history=messages,
        )

        return {
            "response": gemini_result["text"],
            "tool_calls": tool_calls,
            "tools_used": tools_used,
            "tokens_used": gemini_result["tokens_used"],
            "model_name": gemini_result["model_name"],
            "is_live": gemini_result.get("is_live", False),
        }

    def _select_tool(self, prompt: str, role: str) -> Optional[str]:
        """
        Determines which read-only tool to call based on keywords and role permissions.
        """
        p = prompt.lower()

        if any(w in p for w in ["attendance", "present", "absent", "missed days"]):
            return "get_attendance_summary"

        if any(w in p for w in ["grade", "mark", "gpa", "score", "assessment", "report card"]):
            return "get_grade_summary"

        if any(w in p for w in ["homework", "assignment", "due date", "submission"]):
            return "get_homework_summary"

        if any(w in p for w in ["timetable", "schedule", "period", "class time", "room"]):
            return "get_timetable"

        if any(w in p for w in ["fee", "tuition", "invoice", "balance", "paid", "payment"]):
            # Teachers forbidden from fee queries
            if role != "TEACHER":
                return "get_fee_summary"

        if any(w in p for w in ["enrollment", "how many student", "how many teacher", "student count"]):
            if role in ["SCHOOL_ADMIN", "PLATFORM_ADMIN"]:
                return "get_enrollment_summary"

        if any(w in p for w in ["school info", "campus overview", "active year", "departments"]):
            return "get_school_overview"

        if any(w in p for w in ["who am i", "my profile", "my account"]):
            return "get_my_profile"

        return None

    def _build_system_instruction(self, role: str) -> str:
        base_instruction = (
            "You are the official Academic AI Assistant for Samahat Taibah Group Educational Management System (EMS). "
            "You provide professional, accurate, safe, and helpful assistance. "
            "CRITICAL RULES:\n"
            "1. NEVER invent or fabricate student attendance records, grades, fee balances, or institutional metrics. "
            "If verified live data is provided in the prompt, ground your answers in it. If not available, state that records are not found.\n"
            "2. Never claim an administrative action was performed if it was not.\n"
            "3. Enforce strict privacy: Never attempt to reveal other students' grades or sensitive family records.\n"
            "4. Language support: Default to clear English, with polite and encouraging institutional tone.\n"
        )

        role_instructions = {
            "PLATFORM_ADMIN": (
                "You are communicating with a PLATFORM ADMINISTRATOR. "
                "Provide executive, platform-level governance insights across schools, aggregate enrollment numbers, "
                "and systemic health summaries. Be concise and authoritative."
            ),
            "SCHOOL_ADMIN": (
                "You are communicating with a SCHOOL ADMINISTRATOR. "
                "Provide campus operational insights, enrollment statistics, attendance summaries, fee collection rates, "
                "and academic scheduling details for their authorized school."
            ),
            "TEACHER": (
                "You are communicating with a TEACHER. "
                "Help with class schedules, student attendance summaries, homework tracking, and curriculum lesson planning ideas. "
                "You MUST NOT disclose student financial records or unassigned class information."
            ),
            "STUDENT": (
                "You are communicating with a STUDENT. "
                "Be encouraging, supportive, and age-appropriate. Help them understand their personal homework deadlines, "
                "attendance rate, published grades, and explain academic concepts clearly."
            ),
            "PARENT": (
                "You are communicating with a PARENT / GUARDIAN. "
                "Provide clear, reassuring information strictly concerning their verified linked children: "
                "attendance records, homework tasks, published grades, and tuition balances."
            ),
        }

        return base_instruction + "\n" + role_instructions.get(role, "")


academic_workflow = AcademicAgentWorkflow()
