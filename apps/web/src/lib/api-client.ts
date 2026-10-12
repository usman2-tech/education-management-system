/**
 * MODULE: Frontend API Client
 *
 * PURPOSE:
 * Type-safe HTTP client for communicating with the NestJS backend and AI Service.
 *
 * DEPENDENCIES:
 * @ems/contracts.
 */

import { ApiSuccessResponse, SystemHealthResponse } from '@ems/contracts';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function fetchSystemHealth(): Promise<SystemHealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const json: ApiSuccessResponse<SystemHealthResponse> = await res.json();
    return json.data;
  } catch (error) {
    console.warn('Backend API currently unreachable from client:', error);
    return null;
  }
}
