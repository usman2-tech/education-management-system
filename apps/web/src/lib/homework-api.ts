/**
 * Homework Management API Client
 */

import { apiClient } from './api-client';
import {
  HomeworkDto,
  CreateHomeworkDto,
  UpdateHomeworkDto,
  SubmitHomeworkDto,
  GradeHomeworkSubmissionDto,
  HomeworkFilterQuery,
} from '@ems/contracts';

export const homeworkApi = {
  async getHomeworks(params?: HomeworkFilterQuery): Promise<HomeworkDto[]> {
    const query = new URLSearchParams();
    if (params?.schoolId) query.append('schoolId', params.schoolId);
    if (params?.classSectionId) query.append('classSectionId', params.classSectionId);
    if (params?.subjectId) query.append('subjectId', params.subjectId);
    if (params?.status) query.append('status', params.status);
    if (params?.teacherId) query.append('teacherId', params.teacherId);

    const qs = query.toString();
    const url = `/homework${qs ? `?${qs}` : ''}`;
    return apiClient.get<HomeworkDto[]>(url);
  },

  async getHomeworkById(id: string): Promise<any> {
    return apiClient.get<any>(`/homework/${id}`);
  },

  async createHomework(dto: CreateHomeworkDto): Promise<HomeworkDto> {
    return apiClient.post<HomeworkDto>('/homework', dto);
  },

  async updateHomework(id: string, dto: UpdateHomeworkDto): Promise<HomeworkDto> {
    return apiClient.patch<HomeworkDto>(`/homework/${id}`, dto);
  },

  async submitHomework(id: string, dto: SubmitHomeworkDto): Promise<any> {
    return apiClient.post<any>(`/homework/${id}/submit`, dto);
  },

  async gradeSubmission(submissionId: string, dto: GradeHomeworkSubmissionDto): Promise<any> {
    return apiClient.post<any>(`/homework/submissions/${submissionId}/grade`, dto);
  },

  async getStudentHomeworks(studentId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/homework/students/${studentId}`);
  },

  async getClassStats(classSectionId: string): Promise<any> {
    return apiClient.get<any>(`/homework/classes/${classSectionId}/stats`);
  },
};
