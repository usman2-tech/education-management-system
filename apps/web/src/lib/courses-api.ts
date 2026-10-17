/**
 * Course Management API Client
 */

import { apiClient } from './api-client';
import {
  CourseDto,
  CreateCourseDto,
  UpdateCourseDto,
  CreateCourseModuleDto,
  CreateCourseLessonDto,
  CourseEnrollmentDto,
} from '@ems/contracts';

export const coursesApi = {
  async getCourses(params?: { search?: string; subjectId?: string; published?: boolean }): Promise<CourseDto[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.subjectId) query.append('subjectId', params.subjectId);
    if (params?.published !== undefined) query.append('published', String(params.published));

    const qs = query.toString();
    const url = `/courses${qs ? `?${qs}` : ''}`;
    return apiClient.get<CourseDto[]>(url);
  },

  async getCourseById(id: string): Promise<CourseDto> {
    return apiClient.get<CourseDto>(`/courses/${id}`);
  },

  async createCourse(dto: CreateCourseDto): Promise<CourseDto> {
    return apiClient.post<CourseDto>('/courses', dto);
  },

  async updateCourse(id: string, dto: UpdateCourseDto): Promise<CourseDto> {
    return apiClient.patch<CourseDto>(`/courses/${id}`, dto);
  },

  async createModule(courseId: string, dto: CreateCourseModuleDto): Promise<any> {
    return apiClient.post<any>(`/courses/${courseId}/modules`, dto);
  },

  async createLesson(moduleId: string, dto: CreateCourseLessonDto): Promise<any> {
    return apiClient.post<any>(`/courses/modules/${moduleId}/lessons`, dto);
  },

  async enrollCourse(courseId: string): Promise<any> {
    return apiClient.post<any>(`/courses/${courseId}/enroll`, {});
  },

  async completeLesson(lessonId: string): Promise<any> {
    return apiClient.post<any>(`/courses/lessons/${lessonId}/complete`, {});
  },

  async getStudentCourses(studentId: string): Promise<CourseEnrollmentDto[]> {
    return apiClient.get<CourseEnrollmentDto[]>(`/courses/students/${studentId}`);
  },
};
