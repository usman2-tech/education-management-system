"""
MODULE: Internal EMS Tools HTTP Client
PURPOSE:
Enables FastAPI AI agents to query live read-only EMS tools hosted by the NestJS core backend.

SECURITY:
Authenticated strictly via shared internal secret (x-internal-secret).
Enforces role and tenant scope on every dispatch.
"""

import logging
import httpx
from typing import Dict, Any, Optional
from src.config.settings import settings

logger = logging.getLogger("ems-tools-client")


class EMSToolsClient:
    def __init__(self):
        self.base_url = settings.main_api_url.rstrip("/")
        self.secret = settings.internal_secret

    async def execute_tool(
        self,
        tool_name: str,
        user_id: str,
        role: str,
        school_id: Optional[str] = None,
        args: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches a secure tool execution request to NestJS.
        """
        url = f"{self.base_url}/ai/internal/tools/{tool_name}"
        headers = {
            "Content-Type": "application/json",
            "x-internal-secret": self.secret,
        }
        payload = {
            "toolName": tool_name,
            "userId": user_id,
            "role": role,
            "schoolId": school_id,
            "args": args or {},
        }

        logger.info(f"Querying internal EMS tool '{tool_name}' for user={user_id} role={role}")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"EMS tool '{tool_name}' returned HTTP {response.status_code}: {response.text}")
                    return {
                        "toolName": tool_name,
                        "success": False,
                        "error": f"Internal tool query failed with HTTP {response.status_code}",
                    }
        except Exception as e:
            logger.error(f"Failed to reach NestJS internal tool service: {e}")
            return {
                "toolName": tool_name,
                "success": False,
                "error": str(e),
            }


ems_client = EMSToolsClient()
