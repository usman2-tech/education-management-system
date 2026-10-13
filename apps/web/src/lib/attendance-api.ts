/**
 * MODULE: Attendance Management - Web API Client
 *
 * PURPOSE:
 * Typed client helper methods for attendance sessions, atomic bulk marking,
 * student/class histories, reporting, and NFC simulation.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  AttendanceSessionDto,
  AttendanceSessionStatus,
  CreateAttendanceSessionRequest,
  UpdateAttendanceSessionRequest,
  BulkMarkAttendanceRequest,
  StudentAttendanceSummaryDto,
  ClassAttendanceSummaryDto,
  AttendanceReportDto,
  AttendanceReportFilterQuery,
  ProvisionNFCIdentityRequest,
  ProvisionNFCIdentityResponse,
  NFCScanRequest,
  NFCScanResultDto,
  NFCAttendanceEventDto,
} from '@ems/contracts';

// -----------------------------------------------------------------------------
// SESSIONS
// -----------------------------------------------------------------------------

export async function fetchAttendanceSessions(params?: {
  schoolId?: string;
  classSectionId?: string;
  date?: string;
  status?: AttendanceSessionStatus;
}): Promise<AttendanceSessionDto[]> {
  const query = new URLSearchParams();
  if (params?.schoolId) query.append('schoolId', params.schoolId);
  if (params?.classSectionId) query.append('classSectionId', params.classSectionId);
  if (params?.date) query.append('date', params.date);
  if (params?.status) query.append('status', params.status);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<AttendanceSessionDto[]>(`/attendance/sessions${qs}`);
}

export async function createAttendanceSession(
  data: CreateAttendanceSessionRequest,
): Promise<AttendanceSessionDto> {
  return apiClient.post<AttendanceSessionDto>('/attendance/sessions', data);
}

export async function fetchAttendanceSessionById(id: string): Promise<AttendanceSessionDto> {
  return apiClient.get<AttendanceSessionDto>(`/attendance/sessions/${id}`);
}

export async function updateAttendanceSession(
  id: string,
  data: UpdateAttendanceSessionRequest,
): Promise<AttendanceSessionDto> {
  return apiClient.patch<AttendanceSessionDto>(`/attendance/sessions/${id}`, data);
}

export async function finalizeAttendanceSession(id: string): Promise<AttendanceSessionDto> {
  return apiClient.post<AttendanceSessionDto>(`/attendance/sessions/${id}/finalize`, {});
}

// -----------------------------------------------------------------------------
// RECORDS (BULK REGISTER MARKING)
// -----------------------------------------------------------------------------

export async function bulkMarkAttendanceRecords(
  sessionId: string,
  data: BulkMarkAttendanceRequest,
): Promise<AttendanceSessionDto> {
  return apiClient.put<AttendanceSessionDto>(`/attendance/sessions/${sessionId}/records`, data);
}

export async function fetchStudentAttendance(
  studentId: string,
): Promise<StudentAttendanceSummaryDto> {
  return apiClient.get<StudentAttendanceSummaryDto>(`/attendance/students/${studentId}`);
}

export async function fetchClassAttendance(
  classSectionId: string,
): Promise<ClassAttendanceSummaryDto> {
  return apiClient.get<ClassAttendanceSummaryDto>(`/attendance/classes/${classSectionId}`);
}

export async function fetchAttendanceReports(
  filters?: AttendanceReportFilterQuery,
): Promise<AttendanceReportDto> {
  const query = new URLSearchParams();
  if (filters?.schoolId) query.append('schoolId', filters.schoolId);
  if (filters?.classSectionId) query.append('classSectionId', filters.classSectionId);
  if (filters?.studentId) query.append('studentId', filters.studentId);
  if (filters?.startDate) query.append('startDate', filters.startDate);
  if (filters?.endDate) query.append('endDate', filters.endDate);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<AttendanceReportDto>(`/attendance/reports${qs}`);
}

// -----------------------------------------------------------------------------
// NFC SIMULATION
// -----------------------------------------------------------------------------

export async function provisionNFCIdentity(
  data: ProvisionNFCIdentityRequest,
): Promise<ProvisionNFCIdentityResponse> {
  return apiClient.post<ProvisionNFCIdentityResponse>('/attendance/nfc/identities', data);
}

export async function scanNFC(data: NFCScanRequest): Promise<NFCScanResultDto> {
  return apiClient.post<NFCScanResultDto>('/attendance/nfc/scan', data);
}

export async function fetchNFCEvents(sessionId?: string): Promise<NFCAttendanceEventDto[]> {
  const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
  return apiClient.get<NFCAttendanceEventDto[]>(`/attendance/nfc/events${qs}`);
}
