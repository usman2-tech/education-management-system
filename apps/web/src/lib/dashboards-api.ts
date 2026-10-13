/**
 * MODULE: Dashboards API Client
 *
 * PURPOSE:
 * Institutional API client for role-specific dashboard analytics.
 * Connects to NestJS DashboardsModule endpoints.
 */

import {
  PlatformAdminDashboardDto,
  SchoolAdminDashboardDto,
  TeacherDashboardDto,
  StudentDashboardDto,
  ParentDashboardDto,
} from '@ems/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchPlatformAdminDashboard(): Promise<PlatformAdminDashboardDto> {
  const res = await fetch(`${API_BASE_URL}/dashboards/platform-admin`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch platform dashboard.');
  }
  return res.json();
}

export async function fetchSchoolAdminDashboard(
  schoolId?: string,
): Promise<SchoolAdminDashboardDto> {
  const url = new URL(`${API_BASE_URL}/dashboards/school-admin`);
  if (schoolId) url.searchParams.set('schoolId', schoolId);

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch school admin dashboard.');
  }
  return res.json();
}

export async function fetchTeacherDashboard(): Promise<TeacherDashboardDto> {
  const res = await fetch(`${API_BASE_URL}/dashboards/teacher`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch teacher dashboard.');
  }
  return res.json();
}

export async function fetchStudentDashboard(): Promise<StudentDashboardDto> {
  const res = await fetch(`${API_BASE_URL}/dashboards/student`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch student dashboard.');
  }
  return res.json();
}

export async function fetchParentDashboard(
  childId?: string,
): Promise<ParentDashboardDto> {
  const url = new URL(`${API_BASE_URL}/dashboards/parent`);
  if (childId) url.searchParams.set('childId', childId);

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch parent dashboard.');
  }
  return res.json();
}
