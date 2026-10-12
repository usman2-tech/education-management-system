/**
 * MODULE: Institutional School Management API Client
 *
 * PURPOSE:
 * Typed helper methods connecting frontend components to NestJS schools API.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  SchoolDto,
  CreateSchoolRequest,
  UpdateSchoolRequest,
  UpdateSchoolStatusRequest,
  SchoolListQuery,
  PaginatedResponse,
  SchoolAdministratorDto,
} from '@ems/contracts';

export async function fetchSchools(
  query: SchoolListQuery = {},
): Promise<PaginatedResponse<SchoolDto>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);

  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiClient.get<PaginatedResponse<SchoolDto>>(`/schools${qs}`);
}

export async function fetchSchoolById(id: string): Promise<SchoolDto> {
  return apiClient.get<SchoolDto>(`/schools/${id}`);
}

export async function createSchool(data: CreateSchoolRequest): Promise<SchoolDto> {
  return apiClient.post<SchoolDto>('/schools', data);
}

export async function updateSchool(
  id: string,
  data: UpdateSchoolRequest,
): Promise<SchoolDto> {
  return apiClient.request<SchoolDto>(`/schools/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateSchoolStatus(
  id: string,
  data: UpdateSchoolStatusRequest,
): Promise<SchoolDto> {
  return apiClient.request<SchoolDto>(`/schools/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchSchoolAdministrators(
  schoolId: string,
): Promise<SchoolAdministratorDto[]> {
  return apiClient.get<SchoolAdministratorDto[]>(`/schools/${schoolId}/administrators`);
}

export async function assignSchoolAdministrator(
  schoolId: string,
  userId: string,
): Promise<any> {
  return apiClient.post(`/schools/${schoolId}/administrators`, { userId });
}
