/**
 * MODULE: Institutional Teacher Management API Client
 *
 * PURPOSE:
 * Typed client helper methods for teacher onboarding, directory queries,
 * profile modifications, status lifecycles, and school associations.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  TeacherDto,
  CreateTeacherRequest,
  UpdateTeacherRequest,
  UpdateTeacherStatusRequest,
  AssignTeacherSchoolRequest,
  TeacherListQuery,
  PaginatedResponse,
} from '@ems/contracts';

export async function fetchTeachers(
  query: TeacherListQuery = {},
): Promise<PaginatedResponse<TeacherDto>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.schoolId) params.set('schoolId', query.schoolId);
  if (query.status) params.set('status', query.status);

  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiClient.get<PaginatedResponse<TeacherDto>>(`/teachers${qs}`);
}

export async function fetchTeacherById(id: string): Promise<TeacherDto> {
  return apiClient.get<TeacherDto>(`/teachers/${id}`);
}

export async function fetchCurrentTeacherProfile(): Promise<TeacherDto> {
  return apiClient.get<TeacherDto>('/teachers/me');
}

export async function createTeacher(data: CreateTeacherRequest): Promise<TeacherDto> {
  return apiClient.post<TeacherDto>('/teachers', data);
}

export async function updateTeacher(
  id: string,
  data: UpdateTeacherRequest,
): Promise<TeacherDto> {
  return apiClient.request<TeacherDto>(`/teachers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateTeacherStatus(
  id: string,
  data: UpdateTeacherStatusRequest,
): Promise<TeacherDto> {
  return apiClient.request<TeacherDto>(`/teachers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function assignTeacherToSchool(
  id: string,
  data: AssignTeacherSchoolRequest,
): Promise<TeacherDto> {
  return apiClient.post<TeacherDto>(`/teachers/${id}/schools`, data);
}
