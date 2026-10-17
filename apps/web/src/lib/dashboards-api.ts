/**
 * MODULE: Dashboards API Client
 *
 * PURPOSE:
 * Institutional API client for role-specific dashboard analytics.
 * Connects to NestJS DashboardsModule endpoints using the centralized,
 * authenticated apiClient.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  PlatformAdminDashboardDto,
  SchoolAdminDashboardDto,
  TeacherDashboardDto,
  StudentDashboardDto,
  ParentDashboardDto,
} from '@ems/contracts';

export async function fetchPlatformAdminDashboard(): Promise<PlatformAdminDashboardDto> {
  return apiClient.get<PlatformAdminDashboardDto>('/dashboards/platform-admin');
}

export async function fetchSchoolAdminDashboard(
  schoolId?: string,
): Promise<SchoolAdminDashboardDto> {
  const qs = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
  return apiClient.get<SchoolAdminDashboardDto>(`/dashboards/school-admin${qs}`);
}

export async function fetchTeacherDashboard(): Promise<TeacherDashboardDto> {
  return apiClient.get<TeacherDashboardDto>('/dashboards/teacher');
}

export async function fetchStudentDashboard(): Promise<StudentDashboardDto> {
  return apiClient.get<StudentDashboardDto>('/dashboards/student');
}

export async function fetchParentDashboard(
  childId?: string,
): Promise<ParentDashboardDto> {
  const qs = childId ? `?childId=${encodeURIComponent(childId)}` : '';
  return apiClient.get<ParentDashboardDto>(`/dashboards/parent${qs}`);
}
