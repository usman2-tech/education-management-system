/**
 * MODULE: Institutional Academic Structures & Timetable API Client
 *
 * PURPOSE:
 * Typed client helper methods for academic years, classes, sections, subjects,
 * student enrollments, teacher subject assignments, and timetable scheduling.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  AcademicYearDto,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest,
  SchoolClassDto,
  CreateSchoolClassRequest,
  UpdateSchoolClassRequest,
  ClassSectionDto,
  CreateClassSectionRequest,
  UpdateClassSectionRequest,
  SubjectDto,
  CreateSubjectRequest,
  UpdateSubjectRequest,
  ClassEnrollmentDto,
  EnrollStudentRequest,
  TeacherSubjectAssignmentDto,
  AssignTeacherSubjectRequest,
  TimetableEntryDto,
  CreateTimetableEntryRequest,
  UpdateTimetableEntryRequest,
} from '@ems/contracts';

// -----------------------------------------------------------------------------
// ACADEMIC YEARS
// -----------------------------------------------------------------------------

export async function fetchAcademicYears(schoolId?: string): Promise<AcademicYearDto[]> {
  const qs = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
  return apiClient.get<AcademicYearDto[]>(`/academic-years${qs}`);
}

export async function createAcademicYear(data: CreateAcademicYearRequest): Promise<AcademicYearDto> {
  return apiClient.post<AcademicYearDto>('/academic-years', data);
}

export async function updateAcademicYear(
  id: string,
  data: UpdateAcademicYearRequest,
): Promise<AcademicYearDto> {
  return apiClient.put<AcademicYearDto>(`/academic-years/${id}`, data);
}

// -----------------------------------------------------------------------------
// CLASSES & SECTIONS
// -----------------------------------------------------------------------------

export async function fetchClasses(schoolId?: string): Promise<SchoolClassDto[]> {
  const qs = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
  return apiClient.get<SchoolClassDto[]>(`/classes${qs}`);
}

export async function fetchClassById(id: string): Promise<SchoolClassDto & { sections: ClassSectionDto[] }> {
  return apiClient.get<SchoolClassDto & { sections: ClassSectionDto[] }>(`/classes/${id}`);
}

export async function createClass(data: CreateSchoolClassRequest): Promise<SchoolClassDto> {
  return apiClient.post<SchoolClassDto>('/classes', data);
}

export async function updateClass(id: string, data: UpdateSchoolClassRequest): Promise<SchoolClassDto> {
  return apiClient.put<SchoolClassDto>(`/classes/${id}`, data);
}

export async function fetchSections(
  academicYearId?: string,
  classId?: string,
): Promise<ClassSectionDto[]> {
  const params = new URLSearchParams();
  if (academicYearId) params.set('academicYearId', academicYearId);
  if (classId) params.set('classId', classId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiClient.get<ClassSectionDto[]>(`/classes/sections${qs}`);
}

export async function createSection(data: CreateClassSectionRequest): Promise<ClassSectionDto> {
  return apiClient.post<ClassSectionDto>('/classes/sections', data);
}

export async function updateSection(id: string, data: UpdateClassSectionRequest): Promise<ClassSectionDto> {
  return apiClient.put<ClassSectionDto>(`/classes/sections/${id}`, data);
}

// -----------------------------------------------------------------------------
// SUBJECTS
// -----------------------------------------------------------------------------

export async function fetchSubjects(schoolId?: string): Promise<SubjectDto[]> {
  const qs = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
  return apiClient.get<SubjectDto[]>(`/subjects${qs}`);
}

export async function createSubject(data: CreateSubjectRequest): Promise<SubjectDto> {
  return apiClient.post<SubjectDto>('/subjects', data);
}

export async function updateSubject(id: string, data: UpdateSubjectRequest): Promise<SubjectDto> {
  return apiClient.put<SubjectDto>(`/subjects/${id}`, data);
}

// -----------------------------------------------------------------------------
// ENROLLMENTS & TEACHER ASSIGNMENTS
// -----------------------------------------------------------------------------

export async function fetchSectionEnrollments(sectionId: string): Promise<ClassEnrollmentDto[]> {
  return apiClient.get<ClassEnrollmentDto[]>(`/classes/sections/${sectionId}/enrollments`);
}

export async function enrollStudent(
  sectionId: string,
  data: EnrollStudentRequest,
): Promise<ClassEnrollmentDto> {
  return apiClient.post<ClassEnrollmentDto>(`/classes/sections/${sectionId}/enroll`, data);
}

export async function removeStudentEnrollment(
  sectionId: string,
  studentId: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete<{ success: boolean; message: string }>(
    `/classes/sections/${sectionId}/enrollments/${studentId}`,
  );
}

export async function fetchSectionTeacherAssignments(
  sectionId: string,
): Promise<TeacherSubjectAssignmentDto[]> {
  return apiClient.get<TeacherSubjectAssignmentDto[]>(`/classes/sections/${sectionId}/teacher-assignments`);
}

export async function assignTeacherToSubject(
  sectionId: string,
  data: AssignTeacherSubjectRequest,
): Promise<TeacherSubjectAssignmentDto> {
  return apiClient.post<TeacherSubjectAssignmentDto>(`/classes/sections/${sectionId}/assign-teacher`, data);
}

// -----------------------------------------------------------------------------
// TIMETABLES & SCHEDULES
// -----------------------------------------------------------------------------

export async function createTimetableEntry(data: CreateTimetableEntryRequest): Promise<TimetableEntryDto> {
  return apiClient.post<TimetableEntryDto>('/timetable', data);
}

export async function updateTimetableEntry(
  id: string,
  data: UpdateTimetableEntryRequest,
): Promise<TimetableEntryDto> {
  return apiClient.put<TimetableEntryDto>(`/timetable/${id}`, data);
}

export async function deleteTimetableEntry(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/timetable/${id}`);
}

export async function fetchSectionTimetable(sectionId: string): Promise<TimetableEntryDto[]> {
  return apiClient.get<TimetableEntryDto[]>(`/timetable/section/${sectionId}`);
}

export async function fetchTeacherTimetable(teacherId: string): Promise<TimetableEntryDto[]> {
  return apiClient.get<TimetableEntryDto[]>(`/timetable/teacher/${teacherId}`);
}

export async function fetchStudentTimetable(studentId: string): Promise<TimetableEntryDto[]> {
  return apiClient.get<TimetableEntryDto[]>(`/timetable/student/${studentId}`);
}

export async function fetchChildTimetable(childId: string): Promise<TimetableEntryDto[]> {
  return apiClient.get<TimetableEntryDto[]>(`/timetable/child/${childId}`);
}
