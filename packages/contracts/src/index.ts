/**
 * MODULE: System Contracts & Shared DTOs
 *
 * PURPOSE:
 * Provides strictly typed domain entities, role enumerations, and standardized
 * API request/response contracts shared between NestJS backend and Next.js frontend.
 *
 * DEPENDENCIES:
 * Independent foundational package.
 *
 * SECURITY:
 * Defines authoritative roles (UserRole) and access level structures.
 */

export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export enum SchoolStatus {
  ACTIVE = 'ACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message?: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]> | string[];
  timestamp: string;
  path?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SystemHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  services: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
      message?: string;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs?: number;
      message?: string;
    };
    aiService?: {
      status: 'up' | 'down';
      latencyMs?: number;
      url?: string;
    };
  };
}

export interface AIServiceHealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  framework: string;
  langgraph_ready: boolean;
}

export interface NavigationItem {
  id: string;
  title: string;
  href: string;
  iconName: string;
  badge?: string;
  allowedRoles: UserRole[];
  children?: NavigationItem[];
}

// ------------------------------------------------------------------------------
// Authentication & RBAC Contracts
// ------------------------------------------------------------------------------
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  schoolId: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId: string | null;
  school?: {
    id: string;
    name: string;
    code: string;
  } | null;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface UserProfileResponse {
  user: AuthUser;
}

// ------------------------------------------------------------------------------
// Multi-School Management Contracts (TASK 003)
// ------------------------------------------------------------------------------
export interface SchoolDto {
  id: string;
  name: string;
  code: string;
  domain?: string | null;
  status: SchoolStatus;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  settings?: any;
  createdAt: string;
  updatedAt: string;
  administratorsCount?: number;
  studentsCount?: number;
  teachersCount?: number;
}

export interface CreateSchoolRequest {
  name: string;
  code: string;
  domain?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
}

export interface UpdateSchoolRequest {
  name?: string;
  domain?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
}

export interface UpdateSchoolStatusRequest {
  status: SchoolStatus;
}

export interface AssignSchoolAdminRequest {
  userId: string;
}

export interface SchoolListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: SchoolStatus;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SchoolAdministratorDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  assignedAt: string;
}

// ------------------------------------------------------------------------------
// Teacher & Staff Management Contracts (TASK 004)
// ------------------------------------------------------------------------------
export enum TeacherEmploymentStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export interface TeacherProfileDto {
  id: string;
  userId: string;
  employeeCode?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  joiningDate: string;
  employmentStatus: TeacherEmploymentStatus;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherSchoolMembershipDto {
  id: string;
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  role: UserRole;
  isActive: boolean;
  employeeCode?: string | null;
  employmentStatus?: TeacherEmploymentStatus | null;
  joinedAt: string;
}

export interface TeacherDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: TeacherProfileDto | null;
  primarySchool?: {
    id: string;
    name: string;
    code: string;
  } | null;
  memberships: TeacherSchoolMembershipDto[];
}

export interface CreateTeacherRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  schoolId?: string;
  employeeCode?: string;
  qualification?: string;
  specialization?: string;
  phone?: string;
  address?: string;
  bio?: string;
  joiningDate?: string;
}

export interface UpdateTeacherRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  qualification?: string;
  specialization?: string;
  address?: string;
  bio?: string;
  employeeCode?: string;
  joiningDate?: string;
}

export interface UpdateTeacherStatusRequest {
  isActive?: boolean;
  employmentStatus?: TeacherEmploymentStatus;
  schoolId?: string;
}

export interface AssignTeacherSchoolRequest {
  schoolId: string;
  employeeCode?: string;
}

export interface TeacherListQuery {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  status?: string;
}

// ------------------------------------------------------------------------------
// Parent & Guardian Management Contracts (TASK 006)
// ------------------------------------------------------------------------------
export enum GuardianRelationshipType {
  MOTHER = 'MOTHER',
  FATHER = 'FATHER',
  LEGAL_GUARDIAN = 'LEGAL_GUARDIAN',
  STEP_PARENT = 'STEP_PARENT',
  OTHER = 'OTHER',
}

export enum RelationshipVerificationStatus {
  VERIFIED = 'VERIFIED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  REVOKED = 'REVOKED',
}

export interface ParentGuardianProfileDto {
  id: string;
  userId: string;
  occupation?: string | null;
  employer?: string | null;
  relationshipToFamily?: string | null;
  phoneAlt?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedStudentDto {
  id: string; // student user id
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  admissionNumber?: string | null;
  gradeLevel?: string | null;
  schoolId?: string | null;
  schoolName?: string | null;
  relationshipId: string;
  relationshipType: GuardianRelationshipType;
  verificationStatus: RelationshipVerificationStatus;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  notes?: string | null;
  currentSection?: {
    id: string;
    name: string;
    className: string;
    roomNumber?: string | null;
  } | null;
}

export interface ParentGuardianDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  schoolId?: string | null;
  primarySchool?: {
    id: string;
    name: string;
    code: string;
  } | null;
  profile?: ParentGuardianProfileDto | null;
  linkedStudents: LinkedStudentDto[];
}

export interface CreateParentRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  schoolId?: string;
  occupation?: string;
  employer?: string;
  relationshipToFamily?: string;
  phoneAlt?: string;
  address?: string;
}

export interface UpdateParentRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  occupation?: string;
  employer?: string;
  relationshipToFamily?: string;
  phoneAlt?: string;
  address?: string;
}

export interface LinkStudentRequest {
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  notes?: string;
}

export interface VerifyRelationshipRequest {
  verificationStatus: RelationshipVerificationStatus;
  notes?: string;
}

export interface ParentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  status?: string;
}

export interface ParentDashboardSummaryDto {
  parent: ParentGuardianDto;
  students: LinkedStudentDto[];
  activeAlertsCount: number;
}

// ------------------------------------------------------------------------------
// Classes, Academic Structure & Timetable Contracts (TASK 007)
// ------------------------------------------------------------------------------
export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  WITHDRAWN = 'WITHDRAWN',
  TRANSFERRED = 'TRANSFERRED',
  COMPLETED = 'COMPLETED',
}

export interface AcademicYearDto {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  sectionsCount?: number;
}

export interface CreateAcademicYearRequest {
  schoolId?: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface UpdateAcademicYearRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

export interface SchoolClassDto {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  sectionsCount?: number;
}

export interface CreateSchoolClassRequest {
  schoolId?: string;
  name: string;
  code: string;
  description?: string;
  order?: number;
}

export interface UpdateSchoolClassRequest {
  name?: string;
  description?: string;
  order?: number;
}

export interface ClassSectionDto {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  academicYearId: string;
  academicYearName: string;
  name: string;
  capacity: number;
  roomNumber?: string | null;
  classTeacherId?: string | null;
  classTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  enrolledStudentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassSectionRequest {
  classId: string;
  academicYearId: string;
  name: string;
  capacity?: number;
  roomNumber?: string;
  classTeacherId?: string;
}

export interface UpdateClassSectionRequest {
  name?: string;
  capacity?: number;
  roomNumber?: string;
  classTeacherId?: string;
}

export interface SubjectDto {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  department?: string | null;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectRequest {
  schoolId?: string;
  name: string;
  code: string;
  department?: string;
  credits?: number;
}

export interface UpdateSubjectRequest {
  name?: string;
  department?: string;
  credits?: number;
}

export interface ClassEnrollmentDto {
  id: string;
  studentId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    admissionNumber?: string | null;
  };
  sectionId: string;
  academicYearId: string;
  rollNumber?: string | null;
  enrolledAt: string;
  status: EnrollmentStatus;
}

export interface EnrollStudentRequest {
  studentId: string;
  rollNumber?: string;
}

export interface TeacherSubjectAssignmentDto {
  id: string;
  teacherId: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sectionId: string;
  sectionName: string;
  className: string;
  academicYearId: string;
}

export interface AssignTeacherSubjectRequest {
  teacherId: string;
  subjectId: string;
}

export interface TimetableEntryDto {
  id: string;
  schoolId: string;
  sectionId: string;
  sectionName: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  academicYearId: string;
  academicYearName: string;
  dayOfWeek: number; // 1 (Mon) - 7 (Sun)
  periodName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  roomNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimetableEntryRequest {
  sectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: number;
  periodName: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
}

export interface UpdateTimetableEntryRequest {
  subjectId?: string;
  teacherId?: string;
  dayOfWeek?: number;
  periodName?: string;
  startTime?: string;
  endTime?: string;
  roomNumber?: string;
}

export interface TimetableConflictDto {
  hasConflict: boolean;
  conflictType?: 'TEACHER_OVERLAP' | 'SECTION_OVERLAP' | 'ROOM_OVERLAP';
  message?: string;
  conflictingEntry?: TimetableEntryDto;
}




