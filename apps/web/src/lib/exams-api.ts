/**
 * Exam Management API Client
 */

import { apiClient } from './api-client';
import {
  ExamDto,
  CreateExamDto,
  UpdateExamDto,
  ExamAttemptDto,
  SubmitExamDto,
  GradeExamAttemptDto,
} from '@ems/contracts';

export const examsApi = {
  async getExams(params?: {
    schoolId?: string;
    classSectionId?: string;
    subjectId?: string;
    status?: string;
  }): Promise<ExamDto[]> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.append('schoolId', params.schoolId);
    if (params?.classSectionId) query.append('classSectionId', params.classSectionId);
    if (params?.subjectId) query.append('subjectId', params.subjectId);
    if (params?.status) query.append('status', params.status);

    const qs = query.toString();
    const url = `/exams${qs ? `?${qs}` : ''}`;
    return apiClient.get<ExamDto[]>(url);
  },

  async getExamById(id: string): Promise<ExamDto> {
    return apiClient.get<ExamDto>(`/exams/${id}`);
  },

  async createExam(dto: CreateExamDto): Promise<ExamDto> {
    return apiClient.post<ExamDto>('/exams', dto);
  },

  async updateExam(id: string, dto: UpdateExamDto): Promise<ExamDto> {
    return apiClient.patch<ExamDto>(`/exams/${id}`, dto);
  },

  async startExam(id: string): Promise<ExamAttemptDto> {
    return apiClient.post<ExamAttemptDto>(`/exams/${id}/start`, {});
  },

  async submitExam(id: string, dto: SubmitExamDto): Promise<ExamAttemptDto> {
    return apiClient.post<ExamAttemptDto>(`/exams/${id}/submit`, dto);
  },

  async gradeAttempt(attemptId: string, dto: GradeExamAttemptDto): Promise<ExamAttemptDto> {
    return apiClient.post<ExamAttemptDto>(`/exams/attempts/${attemptId}/grade`, dto);
  },

  async publishResults(id: string): Promise<any> {
    return apiClient.post<any>(`/exams/${id}/publish`, {});
  },

  async getStudentExams(studentId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/exams/students/${studentId}`);
  },
};
