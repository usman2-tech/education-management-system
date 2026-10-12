/**
 * MODULE: Institutional Parent Management API Client
 *
 * PURPOSE:
 * Typed client helper methods for parent onboarding, directory queries,
 * profile modifications, student linkages, relationship verifications, and portal analytics.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  ParentGuardianDto,
  CreateParentRequest,
  UpdateParentRequest,
  LinkStudentRequest,
  VerifyRelationshipRequest,
  ParentListQuery,
  ParentDashboardSummaryDto,
  PaginatedResponse,
} from '@ems/contracts';

export async function fetchParents(
  query: ParentListQuery = {},
): Promise<PaginatedResponse<ParentGuardianDto>> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.schoolId) params.set('schoolId', query.schoolId);
  if (query.status) params.set('status', query.status);

  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiClient.get<PaginatedResponse<ParentGuardianDto>>(`/parents${qs}`);
}

export async function fetchParentById(id: string): Promise<ParentGuardianDto> {
  return apiClient.get<ParentGuardianDto>(`/parents/${id}`);
}

export async function fetchCurrentParentProfile(): Promise<ParentGuardianDto> {
  return apiClient.get<ParentGuardianDto>('/parents/me');
}

export async function fetchParentDashboard(): Promise<ParentDashboardSummaryDto> {
  return apiClient.get<ParentDashboardSummaryDto>('/parents/dashboard');
}

export async function createParent(data: CreateParentRequest): Promise<ParentGuardianDto> {
  return apiClient.post<ParentGuardianDto>('/parents', data);
}

export async function updateParent(
  id: string,
  data: UpdateParentRequest,
): Promise<ParentGuardianDto> {
  return apiClient.request<ParentGuardianDto>(`/parents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function linkStudentToParent(
  parentId: string,
  data: LinkStudentRequest,
): Promise<ParentGuardianDto> {
  return apiClient.post<ParentGuardianDto>(`/parents/${parentId}/students`, data);
}

export async function verifyRelationship(
  parentId: string,
  studentId: string,
  data: VerifyRelationshipRequest,
): Promise<ParentGuardianDto> {
  return apiClient.request<ParentGuardianDto>(`/parents/${parentId}/students/${studentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
