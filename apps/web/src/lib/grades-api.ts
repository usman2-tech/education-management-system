/**
 * MODULE: Grades & Academic Performance - Web API Client
 *
 * PURPOSE:
 * Typed client helper methods for assessment categories, assessments,
 * bulk gradebook entry, student reports, class performance analytics, and grading scales.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  AssessmentCategoryDto,
  CreateAssessmentCategoryRequest,
  UpdateAssessmentCategoryRequest,
  AssessmentDto,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  AssessmentGradebookDto,
  BulkSaveGradebookRequest,
  StudentAssessmentGradeDto,
  StudentAcademicSummaryDto,
  ClassPerformanceReportDto,
  GradingScaleDto,
  CreateGradingScaleRequest,
  UpdateGradingScaleRequest,
  AssessmentStatus,
} from '@ems/contracts';

// -----------------------------------------------------------------------------
// CATEGORIES
// -----------------------------------------------------------------------------

export async function fetchAssessmentCategories(params?: {
  schoolId?: string;
  academicYearId?: string;
}): Promise<AssessmentCategoryDto[]> {
  const query = new URLSearchParams();
  if (params?.schoolId) query.append('schoolId', params.schoolId);
  if (params?.academicYearId) query.append('academicYearId', params.academicYearId);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<AssessmentCategoryDto[]>(`/grades/categories${qs}`);
}

export async function createAssessmentCategory(
  data: CreateAssessmentCategoryRequest,
): Promise<AssessmentCategoryDto> {
  return apiClient.post<AssessmentCategoryDto>('/grades/categories', data);
}

export async function updateAssessmentCategory(
  id: string,
  data: UpdateAssessmentCategoryRequest,
): Promise<AssessmentCategoryDto> {
  return apiClient.patch<AssessmentCategoryDto>(`/grades/categories/${id}`, data);
}

export async function deleteAssessmentCategory(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/grades/categories/${id}`);
}

// -----------------------------------------------------------------------------
// ASSESSMENTS
// -----------------------------------------------------------------------------

export async function fetchAssessments(params?: {
  schoolId?: string;
  classSectionId?: string;
  subjectId?: string;
  categoryId?: string;
  academicYearId?: string;
  status?: AssessmentStatus;
}): Promise<AssessmentDto[]> {
  const query = new URLSearchParams();
  if (params?.schoolId) query.append('schoolId', params.schoolId);
  if (params?.classSectionId) query.append('classSectionId', params.classSectionId);
  if (params?.subjectId) query.append('subjectId', params.subjectId);
  if (params?.categoryId) query.append('categoryId', params.categoryId);
  if (params?.academicYearId) query.append('academicYearId', params.academicYearId);
  if (params?.status) query.append('status', params.status);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<AssessmentDto[]>(`/grades/assessments${qs}`);
}

export async function createAssessment(data: CreateAssessmentRequest): Promise<AssessmentDto> {
  return apiClient.post<AssessmentDto>('/grades/assessments', data);
}

export async function fetchAssessmentById(id: string): Promise<AssessmentDto> {
  return apiClient.get<AssessmentDto>(`/grades/assessments/${id}`);
}

export async function updateAssessment(
  id: string,
  data: UpdateAssessmentRequest,
): Promise<AssessmentDto> {
  return apiClient.patch<AssessmentDto>(`/grades/assessments/${id}`, data);
}

export async function publishAssessment(id: string): Promise<AssessmentDto> {
  return apiClient.post<AssessmentDto>(`/grades/assessments/${id}/publish`, {});
}

// -----------------------------------------------------------------------------
// GRADEBOOK
// -----------------------------------------------------------------------------

export async function fetchAssessmentGradebook(id: string): Promise<AssessmentGradebookDto> {
  return apiClient.get<AssessmentGradebookDto>(`/grades/assessments/${id}/gradebook`);
}

export async function saveAssessmentGradebook(
  id: string,
  data: BulkSaveGradebookRequest,
): Promise<AssessmentGradebookDto> {
  return apiClient.put<AssessmentGradebookDto>(`/grades/assessments/${id}/gradebook`, data);
}

// -----------------------------------------------------------------------------
// STUDENT RESULTS & SUMMARIES
// -----------------------------------------------------------------------------

export async function fetchStudentGrades(
  studentId: string,
  academicYearId?: string,
): Promise<StudentAssessmentGradeDto[]> {
  const qs = academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : '';
  return apiClient.get<StudentAssessmentGradeDto[]>(`/grades/students/${studentId}${qs}`);
}

export async function fetchStudentAcademicSummary(
  studentId: string,
  academicYearId?: string,
): Promise<StudentAcademicSummaryDto> {
  const qs = academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : '';
  return apiClient.get<StudentAcademicSummaryDto>(`/grades/students/${studentId}/summary${qs}`);
}

// -----------------------------------------------------------------------------
// CLASS PERFORMANCE & REPORTS
// -----------------------------------------------------------------------------

export async function fetchClassPerformance(
  classSectionId: string,
  params?: { academicYearId?: string; subjectId?: string },
): Promise<ClassPerformanceReportDto> {
  const query = new URLSearchParams();
  if (params?.academicYearId) query.append('academicYearId', params.academicYearId);
  if (params?.subjectId) query.append('subjectId', params.subjectId);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<ClassPerformanceReportDto>(`/grades/classes/${classSectionId}${qs}`);
}

export async function fetchGradesReport(params?: {
  schoolId?: string;
  academicYearId?: string;
  classSectionId?: string;
  subjectId?: string;
}): Promise<ClassPerformanceReportDto> {
  const query = new URLSearchParams();
  if (params?.schoolId) query.append('schoolId', params.schoolId);
  if (params?.academicYearId) query.append('academicYearId', params.academicYearId);
  if (params?.classSectionId) query.append('classSectionId', params.classSectionId);
  if (params?.subjectId) query.append('subjectId', params.subjectId);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<ClassPerformanceReportDto>(`/grades/reports${qs}`);
}

// -----------------------------------------------------------------------------
// GRADING SCALES
// -----------------------------------------------------------------------------

export async function fetchGradingScales(schoolId?: string): Promise<GradingScaleDto[]> {
  const qs = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
  return apiClient.get<GradingScaleDto[]>(`/grades/scales${qs}`);
}

export async function createGradingScale(
  data: CreateGradingScaleRequest,
): Promise<GradingScaleDto> {
  return apiClient.post<GradingScaleDto>('/grades/scales', data);
}

export async function updateGradingScale(
  id: string,
  data: UpdateGradingScaleRequest,
): Promise<GradingScaleDto> {
  return apiClient.patch<GradingScaleDto>(`/grades/scales/${id}`, data);
}
