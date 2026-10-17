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
  selectedRole?: UserRole;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface InviteUserRequest {
  email: string;
  role: UserRole;
  schoolId?: string;
}

export interface ActivateAccountRequest {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface GenericActionResponse {
  success: boolean;
  message: string;
  resetToken?: string;
  activationToken?: string;
}

export interface InvitationDetailsResponse {
  email: string;
  role: UserRole;
  schoolName?: string;
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

// ------------------------------------------------------------------------------
// Attendance Management & NFC Simulation Contracts (TASK 008)
// ------------------------------------------------------------------------------
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum AttendanceSessionType {
  DAILY = 'DAILY',
  PERIOD = 'PERIOD',
}

export enum AttendanceSessionStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
}

export enum NFCIdentityStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum NFCEventStatus {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DUPLICATE = 'DUPLICATE',
}

export interface AttendanceRecordDto {
  id: string;
  attendanceSessionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  admissionNumber?: string | null;
  rollNumber?: string | null;
  status: AttendanceStatus;
  remarks?: string | null;
  markedById: string;
  markedByName: string;
  markedAt: string;
  updatedAt: string;
}

export interface AttendanceSessionDto {
  id: string;
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearName: string;
  classSectionId: string;
  sectionName: string;
  className: string;
  attendanceDate: string; // YYYY-MM-DD
  sessionType: AttendanceSessionType;
  timetableEntryId?: string | null;
  periodName?: string | null;
  subjectName?: string | null;
  status: AttendanceSessionStatus;
  createdById: string;
  createdByName: string;
  finalizedAt?: string | null;
  finalizedById?: string | null;
  finalizedByName?: string | null;
  recordsCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
  records?: AttendanceRecordDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceSessionRequest {
  classSectionId: string;
  attendanceDate: string; // YYYY-MM-DD
  sessionType?: AttendanceSessionType;
  timetableEntryId?: string;
  academicYearId?: string;
}

export interface UpdateAttendanceSessionRequest {
  attendanceDate?: string;
  timetableEntryId?: string;
}

export interface BulkMarkAttendanceItem {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface BulkMarkAttendanceRequest {
  records: BulkMarkAttendanceItem[];
}

export interface StudentAttendanceSummaryDto {
  studentId: string;
  studentName: string;
  studentEmail: string;
  className: string;
  sectionName: string;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  lateSessions: number;
  excusedSessions: number;
  attendancePercentage: number;
  records: Array<{
    id: string;
    sessionId: string;
    date: string;
    sessionType: AttendanceSessionType;
    periodName?: string | null;
    subjectName?: string | null;
    status: AttendanceStatus;
    remarks?: string | null;
  }>;
}

export interface ClassAttendanceSummaryDto {
  classSectionId: string;
  sectionName: string;
  className: string;
  totalStudents: number;
  totalSessions: number;
  averageAttendancePercentage: number;
  sessions: AttendanceSessionDto[];
}

export interface AttendanceReportFilterQuery {
  schoolId?: string;
  classSectionId?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AttendanceReportDto {
  totalSessions: number;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  overallAttendancePercentage: number;
  byDate: Array<{
    date: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  }>;
  byStudent?: Array<{
    studentId: string;
    studentName: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  }>;
}

export interface NFCIdentityDto {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: NFCIdentityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisionNFCIdentityRequest {
  studentId: string;
  cardToken: string;
}

export interface ProvisionNFCIdentityResponse {
  identity: NFCIdentityDto;
  maskedToken: string;
  message: string;
}

export interface NFCScanRequest {
  attendanceSessionId: string;
  cardToken: string;
}

export interface NFCScanResultDto {
  eventStatus: NFCEventStatus;
  message: string;
  studentId?: string;
  studentName?: string;
  markedStatus?: AttendanceStatus;
  rejectionReason?: string;
}

export interface NFCAttendanceEventDto {
  id: string;
  schoolId: string;
  attendanceSessionId: string;
  studentId?: string | null;
  studentName?: string | null;
  eventType: string;
  eventStatus: NFCEventStatus;
  rejectionReason?: string | null;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// Grades & Academic Performance Contracts (TASK 009)
// ------------------------------------------------------------------------------
export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export interface AssessmentCategoryDto {
  id: string;
  schoolId: string;
  academicYearId?: string | null;
  academicYearName?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  name: string;
  description?: string | null;
  weightPercentage: number;
  createdAt: string;
  updatedAt: string;
  assessmentsCount?: number;
}

export interface CreateAssessmentCategoryRequest {
  schoolId?: string;
  academicYearId?: string;
  subjectId?: string;
  name: string;
  description?: string;
  weightPercentage: number;
}

export interface UpdateAssessmentCategoryRequest {
  name?: string;
  description?: string;
  weightPercentage?: number;
  academicYearId?: string;
  subjectId?: string;
}

export interface AssessmentDto {
  id: string;
  schoolId: string;
  academicYearId: string;
  academicYearName: string;
  classSectionId: string;
  className: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  categoryId: string;
  categoryName: string;
  categoryWeight: number;
  title: string;
  description?: string | null;
  maximumMarks: number;
  assessmentDate: string;
  createdById: string;
  createdByName: string;
  status: AssessmentStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  enrolledStudentsCount?: number;
  gradedStudentsCount?: number;
  averageMarks?: number | null;
  averagePercentage?: number | null;
  subject?: { id: string; name: string; code?: string };
  classSection?: { id: string; name: string; schoolClass?: { name: string } };
  category?: { id: string; name: string; weightPercentage: number };
}

export interface CreateAssessmentRequest {
  schoolId?: string;
  academicYearId?: string;
  classSectionId: string;
  subjectId: string;
  categoryId: string;
  title: string;
  description?: string;
  maximumMarks: number;
  assessmentDate: string;
}

export interface UpdateAssessmentRequest {
  title?: string;
  description?: string;
  maximumMarks?: number;
  assessmentDate?: string;
  categoryId?: string;
}

export interface StudentGradeDto {
  id: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  studentAdmissionNumber?: string | null;
  marksObtained?: number | null;
  percentage?: number | null;
  letterGrade?: string | null;
  gradePoint?: number | null;
  feedback?: string | null;
  gradedById: string;
  gradedByName: string;
  gradedAt: string;
  assessmentTitle?: string;
  subjectName?: string;
  maximumMarks?: number;
  categoryName?: string | null;
}

export interface StudentAssessmentGradeDto extends StudentGradeDto {
  assessmentTitle: string;
  subjectName: string;
  maximumMarks: number;
  categoryName?: string | null;
}

export interface GradebookStudentRowDto {
  studentId: string;
  studentName: string;
  admissionNumber?: string | null;
  marksObtained: number | null; // null represents missing grade
  percentage: number | null;
  letterGrade: string | null;
  feedback?: string | null;
}

export interface AssessmentGradebookDto {
  assessment: AssessmentDto;
  students: GradebookStudentRowDto[];
  statistics: {
    enrolledCount: number;
    gradedCount: number;
    missingCount: number;
    averageMarks: number | null;
    averagePercentage: number | null;
    highestMarks: number | null;
    lowestMarks: number | null;
  };
}

export interface GradeEntryItem {
  studentId: string;
  marksObtained?: number | null; // null if unrecorded/missing
  feedback?: string | null;
}

export interface BulkSaveGradebookRequest {
  grades: GradeEntryItem[];
}

export interface GradingScaleDto {
  id: string;
  schoolId: string;
  name: string;
  minimumPercentage: number;
  maximumPercentage: number;
  letterGrade: string;
  gradePoint?: number | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradingScaleRequest {
  schoolId?: string;
  name: string;
  minimumPercentage: number;
  maximumPercentage: number;
  letterGrade: string;
  gradePoint?: number;
  description?: string;
}

export interface UpdateGradingScaleRequest {
  name?: string;
  minimumPercentage?: number;
  maximumPercentage?: number;
  letterGrade?: string;
  gradePoint?: number;
  description?: string;
}

export interface StudentSubjectPerformanceDto {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  overallPercentage: number | null;
  letterGrade: string | null;
  gradePoint: number | null;
  completedAssessments: number;
  totalAssessments: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    weightPercentage: number;
    averagePercentage: number | null;
  }>;
  assessments: Array<{
    assessmentId: string;
    title: string;
    categoryName: string;
    assessmentDate: string;
    maximumMarks: number;
    marksObtained: number | null;
    percentage: number | null;
    letterGrade: string | null;
    feedback: string | null;
  }>;
}

export interface StudentAcademicSummaryDto {
  studentId: string;
  studentName: string;
  className: string;
  sectionName: string;
  schoolName: string;
  gpa: number | null;
  overallPercentage: number | null;
  letterGrade: string | null;
  subjects: StudentSubjectPerformanceDto[];
  trend: Array<{
    date: string;
    assessmentTitle: string;
    subjectCode: string;
    percentage: number;
  }>;
}

export interface ClassAcademicReportDto {
  classSectionId: string;
  className: string;
  sectionName: string;
  academicYearId: string;
  academicYearName: string;
  subjectPerformance: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    averagePercentage: number;
    assessmentCount: number;
    gradedCount: number;
  }>;
  gradeDistribution: Array<{
    letterGrade: string;
    count: number;
    percentage: number;
  }>;
  studentRankings: Array<{
    studentId: string;
    studentName: string;
    admissionNumber: string | null;
    overallPercentage: number;
    letterGrade: string;
    rank: number;
  }>;
}

export type ClassPerformanceReportDto = ClassAcademicReportDto;

// ==============================================================================
// TASK 010 — HOMEWORK & LEARNING CONTENT CONTRACTS
// ==============================================================================
export type HomeworkStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type HomeworkSubmissionStatus = 'PENDING' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RESUBMISSION_REQUESTED';

export interface HomeworkDto {
  id: string;
  schoolId: string;
  academicYearId?: string | null;
  classSectionId: string;
  className?: string;
  sectionName?: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  teacherId: string;
  teacherName?: string;
  title: string;
  instructions: string;
  dueDate: string;
  maxPoints: number;
  status: HomeworkStatus;
  attachments?: string | null;
  createdAt: string;
  updatedAt: string;
  totalSubmissions?: number;
  gradedSubmissions?: number;
}

export interface CreateHomeworkDto {
  classSectionId: string;
  subjectId: string;
  title: string;
  instructions: string;
  dueDate: string;
  maxPoints?: number;
  status?: HomeworkStatus;
  attachments?: string;
  academicYearId?: string;
}

export interface UpdateHomeworkDto {
  title?: string;
  instructions?: string;
  dueDate?: string;
  maxPoints?: number;
  status?: HomeworkStatus;
  attachments?: string;
}

export interface HomeworkSubmissionDto {
  id: string;
  homeworkId: string;
  homeworkTitle?: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  content?: string | null;
  attachments?: string | null;
  status: HomeworkSubmissionStatus;
  submittedAt: string;
  isLate: boolean;
  grade?: number | null;
  maxPoints?: number;
  feedback?: string | null;
  gradedById?: string | null;
  gradedByName?: string | null;
  gradedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitHomeworkDto {
  content?: string;
  attachments?: string;
}

export interface GradeHomeworkSubmissionDto {
  grade: number;
  feedback?: string;
}

export interface HomeworkFilterQuery {
  schoolId?: string;
  classSectionId?: string;
  subjectId?: string;
  status?: HomeworkStatus;
  teacherId?: string;
}

// ==============================================================================
// TASK 011 — COURSE MANAGEMENT CONTRACTS
// ==============================================================================
export interface CourseLessonDto {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  videoUrl?: string | null;
  attachments?: string | null;
  order: number;
  durationMinutes: number;
  isCompleted?: boolean;
}

export interface CourseModuleDto {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: CourseLessonDto[];
}

export interface CourseDto {
  id: string;
  schoolId: string;
  schoolName?: string;
  subjectId?: string | null;
  subjectName?: string | null;
  title: string;
  code: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  published: boolean;
  createdById: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  modules?: CourseModuleDto[];
  totalModules?: number;
  totalLessons?: number;
  enrolledStudentsCount?: number;
  progressPercentage?: number;
  isEnrolled?: boolean;
}

export interface CreateCourseDto {
  subjectId?: string;
  title: string;
  code: string;
  description?: string;
  thumbnailUrl?: string;
  published?: boolean;
}

export interface UpdateCourseDto {
  title?: string;
  code?: string;
  description?: string;
  thumbnailUrl?: string;
  published?: boolean;
  subjectId?: string;
}

export interface CreateCourseModuleDto {
  title: string;
  description?: string;
  order?: number;
}

export interface CreateCourseLessonDto {
  title: string;
  content: string;
  videoUrl?: string;
  attachments?: string;
  order?: number;
  durationMinutes?: number;
}

export interface CourseEnrollmentDto {
  id: string;
  courseId: string;
  courseTitle?: string;
  courseCode?: string;
  studentId: string;
  studentName?: string;
  enrolledAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED';
  completedAt?: string | null;
  completedLessonsCount?: number;
  totalLessonsCount?: number;
  progressPercentage?: number;
}

// ==============================================================================
// TASK 012 — EXAMINATIONS & ASSESSMENTS CONTRACTS
// ==============================================================================
export type ExamStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'RESULTS_PUBLISHED';
export type ExamQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
export type ExamAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';

export interface ExamQuestionDto {
  id: string;
  examId: string;
  questionText: string;
  questionType: ExamQuestionType;
  options?: string[] | null; // parsed JSON
  correctAnswer?: string | null; // hidden from students until published
  marks: number;
  order: number;
}

export interface CreateExamQuestionDto {
  questionText: string;
  questionType: ExamQuestionType;
  options?: string[];
  correctAnswer?: string;
  marks: number;
  order?: number;
}

export interface ExamDto {
  id: string;
  schoolId: string;
  schoolName?: string;
  academicYearId?: string | null;
  classSectionId: string;
  className?: string;
  sectionName?: string;
  subjectId: string;
  subjectName?: string;
  createdById: string;
  creatorName?: string;
  title: string;
  description?: string | null;
  examDate: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  status: ExamStatus;
  questions?: ExamQuestionDto[];
  totalQuestions?: number;
  myAttempt?: ExamAttemptDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExamDto {
  classSectionId: string;
  subjectId: string;
  academicYearId?: string;
  title: string;
  description?: string;
  examDate: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks?: number;
  status?: ExamStatus;
  questions?: CreateExamQuestionDto[];
}

export interface UpdateExamDto {
  title?: string;
  description?: string;
  examDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  totalMarks?: number;
  passingMarks?: number;
  status?: ExamStatus;
}

export interface ExamStudentAnswerDto {
  questionId: string;
  questionText?: string;
  questionType?: ExamQuestionType;
  answerText: string;
  isCorrect?: boolean | null;
  awardedMarks?: number | null;
  maxMarks?: number;
  teacherFeedback?: string | null;
}

export interface ExamAttemptDto {
  id: string;
  examId: string;
  examTitle?: string;
  studentId: string;
  studentName?: string;
  startedAt: string;
  submittedAt?: string | null;
  status: ExamAttemptStatus;
  obtainedMarks?: number | null;
  totalMarks?: number;
  percentage?: number | null;
  feedback?: string | null;
  gradedById?: string | null;
  gradedByName?: string | null;
  answers?: ExamStudentAnswerDto[];
}

export interface SubmitExamDto {
  answers: Array<{
    questionId: string;
    answerText: string;
  }>;
}

export interface GradeExamAttemptDto {
  feedback?: string;
  grades: Array<{
    questionId: string;
    awardedMarks: number;
    teacherFeedback?: string;
  }>;
}

// ==============================================================================
// TASK 013 — SUBSCRIPTION MANAGEMENT CONTRACTS
// ==============================================================================
export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';

export interface SubscriptionPlanDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  currency: string;
  durationDays: number;
  maxStudents: number;
  maxTeachers: number;
  features?: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeSubscriptionsCount?: number;
}

export interface CreateSubscriptionPlanDto {
  name: string;
  code: string;
  description?: string;
  price: number;
  currency?: string;
  durationDays: number;
  maxStudents: number;
  maxTeachers: number;
  features?: string[];
  isActive?: boolean;
}

export interface UpdateSubscriptionPlanDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  durationDays?: number;
  maxStudents?: number;
  maxTeachers?: number;
  features?: string[];
  isActive?: boolean;
}

export interface SchoolSubscriptionDto {
  id: string;
  schoolId: string;
  schoolName: string;
  planId: string;
  planName: string;
  planCode: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  maxStudents: number;
  maxTeachers: number;
  features?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignSchoolSubscriptionDto {
  schoolId: string;
  planId: string;
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
}

// ==============================================================================
// TASK 014 — SUBSCRIPTION CODES & REDEMPTION CONTRACTS
// ==============================================================================
export interface SubscriptionCodeDto {
  id: string;
  code: string;
  planId: string;
  planName?: string;
  schoolId?: string | null;
  schoolName?: string | null;
  maxRedemptions: number;
  timesRedeemed: number;
  expiresAt: string;
  isRevoked: boolean;
  createdById: string;
  creatorEmail?: string;
  createdAt: string;
  redemptionsCount?: number;
}

export interface GenerateSubscriptionCodesDto {
  planId: string;
  count: number;
  prefix?: string;
  schoolId?: string;
  maxRedemptions?: number;
  expiresAt: string;
}

export interface RedeemSubscriptionCodeDto {
  code: string;
  schoolId?: string;
}

export interface CodeRedemptionDto {
  id: string;
  codeId: string;
  codeValue: string;
  planName: string;
  userId: string;
  userEmail: string;
  userName: string;
  schoolId: string;
  schoolName: string;
  redeemedAt: string;
}

// ==============================================================================
// TASK 015 & TASK 030 — NOTIFICATIONS & DIRECT MESSAGING CONTRACTS
// ==============================================================================
export type NotificationType = 'INFO' | 'WARNING' | 'HOMEWORK' | 'EXAM' | 'GRADE' | 'ATTENDANCE' | 'SUBSCRIPTION' | 'ANNOUNCEMENT' | 'FEE';

export interface NotificationDto {
  id: string;
  userId: string;
  schoolId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  schoolId?: string;
  metadata?: Record<string, any>;
}

export interface DirectMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface ConversationParticipantDto {
  userId: string;
  name: string;
  email: string;
  role: string;
  lastReadAt?: string | null;
}

export interface ConversationDto {
  id: string;
  schoolId: string;
  subject?: string | null;
  lastMessageAt: string;
  createdAt: string;
  participants: ConversationParticipantDto[];
  lastMessage?: DirectMessageDto | null;
  unreadCount?: number;
}

export interface CreateConversationDto {
  recipientId: string;
  subject?: string;
  initialMessage: string;
}

export interface SendMessageDto {
  content: string;
}

export interface AnnouncementPreviewDto {
  recipientCount: number;
  targetRole?: string;
  classSectionId?: string;
  sampleRecipients: {
    id: string;
    name: string;
    role: string;
    email: string;
  }[];
}

export interface BroadcastAnnouncementRequest {
  title: string;
  message: string;
  targetRole?: string;
  classSectionId?: string;
  link?: string;
}

export interface RecipientContactDto {
  id: string;
  name: string;
  role: string;
  email: string;
  context?: string;
}

export interface NotificationPreferenceDto {
  id: string;
  schoolId: string;
  absenceAlertsEnabled: boolean;
  attendanceCorrectionAlertsEnabled: boolean;
  homeworkAlertsEnabled: boolean;
  feeAlertsEnabled: boolean;
  transportAlertsEnabled: boolean;
  libraryAlertsEnabled: boolean;
  updatedAt: string;
}

export interface UpdateNotificationPreferenceRequest {
  absenceAlertsEnabled?: boolean;
  attendanceCorrectionAlertsEnabled?: boolean;
  homeworkAlertsEnabled?: boolean;
  feeAlertsEnabled?: boolean;
  transportAlertsEnabled?: boolean;
  libraryAlertsEnabled?: boolean;
}

// ==============================================================================
// TASK 016 — ROLE-BASED DASHBOARD CONTRACTS
// ==============================================================================
export interface PlatformAdminDashboardDto {
  totalSchools: number;
  activeSchools: number;
  totalTeachers: number;
  totalStudents: number;
  totalParents: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  enrollmentTrends: Array<{
    month: string;
    students: number;
    teachers: number;
  }>;
  schoolComparisons: Array<{
    schoolId: string;
    schoolName: string;
    code: string;
    studentsCount: number;
    teachersCount: number;
    status: string;
  }>;
  attendanceTrends: Array<{
    date: string;
    percentage: number;
  }>;
  recentAdministrativeEvents: Array<{
    id: string;
    action: string;
    entityType: string;
    actorEmail: string | null;
    createdAt: string;
  }>;
}

export interface SchoolAdminDashboardDto {
  totalStudents: number;
  totalTeachers: number;
  activeClasses: number;
  dailyAttendancePercentage: number;
  attendanceTrends: Array<{
    date: string;
    percentage: number;
  }>;
  gradeDistribution: Array<{
    letterGrade: string;
    count: number;
  }>;
  subjectPerformance: Array<{
    subjectName: string;
    averagePercentage: number;
  }>;
  homeworkCompletionRate: number;
  upcomingExamsCount: number;
  upcomingExams: Array<{
    id: string;
    title: string;
    subjectName: string;
    className: string;
    examDate: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: string;
  }>;
}

export interface TeacherDashboardDto {
  assignedClassesCount: number;
  assignedClasses: Array<{
    id: string;
    name: string;
    className: string;
    studentsCount: number;
    subjects: string[];
  }>;
  todaySchedule: Array<{
    id: string;
    periodName: string;
    startTime: string;
    endTime: string;
    subjectName: string;
    className: string;
    roomNumber?: string | null;
  }>;
  pendingAttendanceCount: number;
  pendingHomeworkReviewsCount: number;
  pendingGradingCount: number;
  classPerformance: Array<{
    className: string;
    subjectName: string;
    averagePercentage: number;
  }>;
  upcomingExams: Array<{
    id: string;
    title: string;
    className: string;
    subjectName: string;
    examDate: string;
  }>;
  recentMessages: DirectMessageDto[];
}

export interface StudentDashboardDto {
  attendancePercentage: number;
  gpa: number | null;
  overallPercentage: number | null;
  letterGrade: string | null;
  todaySchedule: Array<{
    periodName: string;
    startTime: string;
    endTime: string;
    subjectName: string;
    roomNumber?: string | null;
  }>;
  pendingHomework: Array<{
    id: string;
    title: string;
    subjectName: string;
    dueDate: string;
    maxPoints: number;
  }>;
  upcomingExams: Array<{
    id: string;
    title: string;
    subjectName: string;
    examDate: string;
    durationMinutes: number;
  }>;
  courseCompletionPercentage: number;
  notifications: NotificationDto[];
  recentGrades: Array<{
    id: string;
    title: string;
    subjectName: string;
    marksObtained: number | null;
    maximumMarks: number;
    percentage: number | null;
    letterGrade: string | null;
  }>;
}

export interface ParentDashboardDto {
  children: Array<{
    studentId: string;
    studentName: string;
    className: string;
    admissionNumber: string | null;
    attendancePercentage: number;
    overallPercentage: number | null;
    gpa: number | null;
    letterGrade: string | null;
    pendingHomeworkCount: number;
    upcomingExamsCount: number;
  }>;
  selectedChildId: string;
  selectedChildSchedule: Array<{
    periodName: string;
    startTime: string;
    endTime: string;
    subjectName: string;
  }>;
  selectedChildRecentGrades: Array<{
    title: string;
    subjectName: string;
    marksObtained: number | null;
    maximumMarks: number;
    percentage: number | null;
    letterGrade: string | null;
  }>;
  schoolAnnouncements: NotificationDto[];
  teacherMessages: DirectMessageDto[];
}

// ==============================================================================
// TASK 021 — STUDENT FEE MANAGEMENT CONTRACTS
// ==============================================================================

export type FeeFrequency = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'CUSTOM';
export type FeeInvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
export type FeePaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
export type DiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE' | 'SCHOLARSHIP' | 'SIBLING' | 'WAIVER';

export interface FeeCategoryDto {
  id: string;
  schoolId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  isTuition: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeeCategoryRequest {
  schoolId?: string;
  name: string;
  code?: string;
  description?: string;
  isTuition?: boolean;
}

export interface FeeStructureDto {
  id: string;
  schoolId: string;
  academicYearId: string;
  categoryId: string;
  name: string;
  gradeLevel?: string | null;
  amount: number;
  currency: string;
  frequency: FeeFrequency;
  dueDateDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: FeeCategoryDto;
  academicYear?: { id: string; name: string };
}

export interface CreateFeeStructureRequest {
  schoolId?: string;
  academicYearId: string;
  categoryId: string;
  name: string;
  gradeLevel?: string;
  amount: number;
  currency?: string;
  frequency?: FeeFrequency;
  dueDateDays?: number;
  isActive?: boolean;
}

export interface FeeDiscountDto {
  id: string;
  schoolId: string;
  name: string;
  type: DiscountType;
  value: number;
  reason?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeeDiscountRequest {
  schoolId?: string;
  name: string;
  type: DiscountType;
  value: number;
  reason?: string;
  isActive?: boolean;
}

export interface StudentFeeAssignmentDto {
  id: string;
  schoolId: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string | null;
  academicYearId: string;
  academicYearName?: string;
  feeStructureId: string;
  feeStructureName?: string;
  amount?: number;
  currency?: string;
  discountId?: string | null;
  discountName?: string | null;
  customAmount?: number | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AssignStudentFeeRequest {
  schoolId?: string;
  studentId?: string;
  classSectionId?: string;
  academicYearId: string;
  feeStructureId: string;
  discountId?: string;
  customAmount?: number;
  notes?: string;
  generateInvoice?: boolean;
}

export interface FeeInvoiceItemDto {
  id: string;
  invoiceId: string;
  feeStructureId?: string | null;
  name: string;
  amount: number;
}

export interface FeeInvoiceDto {
  id: string;
  invoiceNumber: string;
  schoolId: string;
  schoolName?: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string | null;
  gradeLevel?: string | null;
  className?: string | null;
  academicYearId: string;
  academicYearName?: string;
  discountId?: string | null;
  discountName?: string | null;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  status: FeeInvoiceStatus;
  issueDate: string;
  dueDate: string;
  voidReason?: string | null;
  notes?: string | null;
  createdAt: string;
  items: FeeInvoiceItemDto[];
  payments?: FeePaymentDto[];
}

export interface CreateFeeInvoiceRequest {
  schoolId?: string;
  studentId: string;
  academicYearId: string;
  discountId?: string;
  dueDate: string;
  notes?: string;
  items: Array<{ name: string; amount: number; feeStructureId?: string }>;
}

export interface FeePaymentDto {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber?: string;
  schoolId: string;
  schoolName?: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string | null;
  recordedById: string;
  recordedByName: string;
  amount: number;
  currency: string;
  paymentMethod: FeePaymentMethod;
  paymentDate: string;
  referenceNumber?: string | null;
  notes?: string | null;
  isReversed: boolean;
  reversalReason?: string | null;
  remainingBalance?: number;
  createdAt: string;
}

export interface RecordFeePaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMethod: FeePaymentMethod;
  referenceNumber?: string;
  notes?: string;
  paymentDate?: string;
}

export interface FeeDashboardDto {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  collectionRate: number;
  studentsWithOutstandingFees: number;
  currency: string;
  monthlyBilledVsCollected: Array<{ month: string; billed: number; collected: number }>;
  paymentMethodDistribution: Array<{ method: string; count: number; total: number }>;
  collectionByCategory: Array<{ category: string; amount: number }>;
  outstandingByClass: Array<{ className: string; amount: number }>;
  recentPayments: FeePaymentDto[];
  overdueInvoices: FeeInvoiceDto[];
}

export interface StudentFeeProfileDto {
  studentId: string;
  studentName: string;
  admissionNumber?: string | null;
  className?: string | null;
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueBalance: number;
  currency: string;
  assignments: StudentFeeAssignmentDto[];
  invoices: FeeInvoiceDto[];
  payments: FeePaymentDto[];
  discounts: FeeDiscountDto[];
}

// ==============================================================================
// AI Assistant Contracts (TASK 022)
// ==============================================================================

export enum AIMessageSender {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export interface AIMessageDto {
  id: string;
  conversationId: string;
  sender: AIMessageSender;
  content: string;
  toolCalls?: Array<{
    name: string;
    args?: Record<string, any>;
    result?: Record<string, any>;
  }> | null;
  tokensUsed?: number | null;
  modelName?: string | null;
  createdAt: string;
}

export interface AIConversationDto {
  id: string;
  userId: string;
  schoolId?: string | null;
  title: string;
  roleContext: UserRole;
  messages?: AIMessageDto[];
  messageCount?: number;
  lastMessageSnippet?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAIConversationDto {
  title?: string;
  initialMessage?: string;
}

export interface SendAIMessageDto {
  conversationId?: string;
  message: string;
}

export interface AIChatResponseDto {
  conversationId: string;
  message: AIMessageDto;
  suggestedQuestions?: string[];
  toolsUsed?: string[];
}

export interface AIUsageSummaryDto {
  totalRequests: number;
  totalTokens: number;
  modelName: string;
  activeProvider: string;
}

// ==============================================================================
// AI Teacher Copilot Contracts (TASK 023)
// ==============================================================================

export enum AICopilotContentType {
  LESSON_PLAN = 'LESSON_PLAN',
  HOMEWORK = 'HOMEWORK',
  EXAM = 'EXAM',
  GRADING_SUGGESTION = 'GRADING_SUGGESTION',
  PERFORMANCE_INSIGHT = 'PERFORMANCE_INSIGHT',
  TEACHING_MATERIAL = 'TEACHING_MATERIAL',
}

export enum AICopilotDraftStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface AICopilotDraftDto {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName?: string;
  contentType: AICopilotContentType;
  title: string;
  content: any;
  classSectionId?: string | null;
  classSectionName?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  courseId?: string | null;
  courseTitle?: string | null;
  status: AICopilotDraftStatus;
  metadata?: Record<string, any> | null;
  publishedEntityId?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateLessonPlanDto {
  classSectionId: string;
  subjectId?: string;
  courseId?: string;
  topic: string;
  learningObjectives: string;
  durationMinutes?: number;
  difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  instructions?: string;
}

export interface GenerateHomeworkDto {
  classSectionId: string;
  subjectId: string;
  topic: string;
  learningObjectives?: string;
  difficultyLevel?: 'EASY' | 'MEDIUM' | 'HARD';
  questionCount?: number;
  instructions?: string;
  dueDate?: string;
}

export interface GenerateExamDto {
  classSectionId: string;
  subjectId: string;
  courseId?: string;
  topic: string;
  questionTypes?: ('MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY')[];
  difficultyLevel?: 'EASY' | 'MEDIUM' | 'HARD';
  questionCount?: number;
  totalMarks?: number;
  durationMinutes?: number;
  instructions?: string;
}

export interface GenerateGradingSuggestionDto {
  submissionId: string;
  rubricCriteria?: string;
  markingGuide?: string;
}

export interface GeneratePerformanceInsightDto {
  classSectionId: string;
  subjectId?: string;
}

export interface GenerateTeachingMaterialDto {
  classSectionId?: string;
  subjectId?: string;
  courseId?: string;
  materialType: 'WORKSHEET' | 'REVISION_NOTES' | 'STUDY_GUIDE' | 'CLASSROOM_ACTIVITY' | 'FLASHCARDS' | 'TOPIC_SUMMARY';
  topic: string;
  difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  length?: 'BRIEF' | 'STANDARD' | 'COMPREHENSIVE';
  learningObjectives?: string;
}

export interface UpdateCopilotDraftDto {
  title?: string;
  content?: any;
  status?: AICopilotDraftStatus;
}

export interface ApproveAndPublishDto {
  targetStatus: 'APPROVED' | 'PUBLISHED';
  confirmedScore?: number;
  teacherFeedback?: string;
  publishOptions?: {
    dueDate?: string;
    examDate?: string;
    maxPoints?: number;
    totalMarks?: number;
    passingMarks?: number;
    teacherConfirmedScore?: number;
    teacherConfirmedFeedback?: string;
  };
}

// ------------------------------------------------------------------------------
// AI Student Tutor & Parent Assistant (TASK 024)
// ------------------------------------------------------------------------------

export interface StudentPracticeQuizDto {
  id: string;
  schoolId: string;
  studentId: string;
  subjectId?: string | null;
  subjectName?: string | null;
  courseId?: string | null;
  courseTitle?: string | null;
  topic: string;
  difficulty: string;
  questionCount: number;
  questions: Array<{
    questionNumber: number;
    questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    questionText: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }>;
  studentAnswers?: Record<string, string> | null;
  score?: number | null;
  totalQuestions: number;
  status: 'GENERATED' | 'COMPLETED';
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentRevisionPlanDto {
  id: string;
  schoolId: string;
  studentId: string;
  title: string;
  targetDate?: string | null;
  plan: {
    overview: string;
    targetGoals: string[];
    revisionPriorities: Array<{
      subject: string;
      topic: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      reason: string;
    }>;
    dailySchedule: Array<{
      day: string;
      focusSubject: string;
      suggestedMinutes: number;
      recommendedActivity: string;
    }>;
    examPrepTips: string[];
  };
  verifiedMetrics?: {
    averageGrade?: number;
    attendanceRate?: number;
    homeworkCompletionRate?: number;
  } | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface GenerateConceptExplanationDto {
  subjectId?: string;
  courseId?: string;
  topic: string;
  difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  explanationStyle?: 'INTUITIVE' | 'STEP_BY_STEP' | 'ACADEMIC' | 'VISUAL_ANALOGY';
  question?: string;
}

export interface SocraticTutorMessageDto {
  conversationId?: string;
  subjectId?: string;
  courseId?: string;
  topic?: string;
  message: string;
}

export interface GeneratePracticeQuizDto {
  subjectId?: string;
  courseId?: string;
  topic: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  questionCount?: number;
  questionType?: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'MIXED';
}

export interface SubmitPracticeQuizDto {
  answers: Record<string, string>;
}

export interface GenerateRevisionPlanDto {
  targetDate?: string;
  focusSubjectIds?: string[];
  customGoals?: string;
}

export interface HomeworkGuidanceRequestDto {
  homeworkId: string;
  questionOrDoubt: string;
}

export interface ParentLinkedChildDto {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  admissionNumber?: string | null;
  gradeLevel?: string | null;
  sectionName?: string | null;
  relationshipType: string;
  verificationStatus: string;
  schoolId: string;
  schoolName: string;
}

export interface ParentAskQuestionDto {
  studentId: string;
  category: 'ACADEMIC_PROGRESS' | 'ATTENDANCE' | 'HOMEWORK' | 'FEES' | 'HOME_LEARNING' | 'GENERAL';
  question: string;
  conversationId?: string;
}

// ==============================================================================
// TASK 027: TRANSPORT MANAGEMENT CONTRACTS & DTOS
// ==============================================================================

export type VehicleType = 'BUS' | 'VAN' | 'MINIBUS' | 'SUV' | 'OTHER';
export type VehicleMaintenanceStatus = 'GOOD' | 'NEEDS_SERVICE' | 'UNDER_MAINTENANCE';
export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'SUSPENDED';
export type RouteDirection = 'PICKUP' | 'DROPOFF' | 'ROUND_TRIP';
export type TransportTripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TransportAttendanceStatus = 'BOARDED' | 'DROPPED_OFF' | 'ABSENT';
export type VehicleExpenseType = 'FUEL' | 'MAINTENANCE' | 'INSURANCE' | 'TOLL' | 'OTHER';

export interface VehicleDto {
  id: string;
  schoolId: string;
  registrationNumber: string;
  vehicleCode: string;
  vehicleType: VehicleType;
  seatingCapacity: number;
  insuranceNumber?: string | null;
  insuranceExpiry?: string | null;
  registrationExpiry?: string | null;
  maintenanceStatus: VehicleMaintenanceStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedDriver?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  allocatedStudentCount?: number;
}

export interface CreateVehicleDto {
  registrationNumber: string;
  vehicleCode: string;
  vehicleType?: VehicleType;
  seatingCapacity: number;
  insuranceNumber?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  maintenanceStatus?: VehicleMaintenanceStatus;
  isActive?: boolean;
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {}

export interface DriverDto {
  id: string;
  schoolId: string;
  userId?: string | null;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry?: string | null;
  status: DriverStatus;
  assignedVehicleId?: string | null;
  assignedVehicle?: {
    id: string;
    registrationNumber: string;
    vehicleCode: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverDto {
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry?: string;
  status?: DriverStatus;
  assignedVehicleId?: string;
  userId?: string;
}

export interface UpdateDriverDto extends Partial<CreateDriverDto> {}

export interface RouteStopDto {
  id: string;
  routeId: string;
  stopName: string;
  stopOrder: number;
  latitude: number;
  longitude: number;
  scheduledTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStopDto {
  stopName: string;
  stopOrder: number;
  latitude: number;
  longitude: number;
  scheduledTime?: string;
}

export interface TransportRouteDto {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  direction: RouteDirection;
  assignedVehicleId?: string | null;
  assignedDriverId?: string | null;
  assignedVehicle?: VehicleDto | null;
  assignedDriver?: DriverDto | null;
  isActive: boolean;
  stops: RouteStopDto[];
  allocatedStudentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRouteDto {
  name: string;
  code: string;
  direction?: RouteDirection;
  assignedVehicleId?: string;
  assignedDriverId?: string;
  isActive?: boolean;
  stops?: CreateStopDto[];
}

export interface UpdateRouteDto extends Partial<CreateRouteDto> {}

export interface StudentTransportAllocationDto {
  id: string;
  schoolId: string;
  studentId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    admissionNumber?: string | null;
    gradeLevel?: string | null;
    sectionName?: string | null;
  };
  routeId: string;
  route: {
    id: string;
    name: string;
    code: string;
  };
  pickupStopId?: string | null;
  pickupStop?: RouteStopDto | null;
  dropoffStopId?: string | null;
  dropoffStop?: RouteStopDto | null;
  vehicleId?: string | null;
  vehicle?: {
    id: string;
    registrationNumber: string;
    vehicleCode: string;
    seatingCapacity: number;
  } | null;
  startDate: string;
  endDate?: string | null;
  monthlyFee: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAllocationDto {
  studentId: string;
  routeId: string;
  pickupStopId?: string;
  dropoffStopId?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
  monthlyFee?: number;
}

export interface UpdateAllocationDto extends Partial<CreateAllocationDto> {
  status?: string;
}

export interface TransportTripDto {
  id: string;
  schoolId: string;
  routeId: string;
  route: {
    id: string;
    name: string;
    code: string;
    stops: RouteStopDto[];
  };
  vehicleId: string;
  vehicle: {
    id: string;
    registrationNumber: string;
    vehicleCode: string;
  };
  driverId?: string | null;
  driver?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  tripType: RouteDirection;
  status: TransportTripStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  latestLocation?: VehicleLocationDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartTripDto {
  routeId: string;
  vehicleId: string;
  tripType: RouteDirection;
}

export interface VehicleLocationDto {
  id: string;
  tripId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  isSimulated: boolean;
  timestamp: string;
}

export interface GpsUpdateDto {
  tripId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
  isSimulated?: boolean;
}

export interface TransportAttendanceDto {
  id: string;
  tripId: string;
  studentId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  vehicleId: string;
  status: TransportAttendanceStatus;
  recordedAt: string;
  recordedById?: string | null;
  notes?: string | null;
}

export interface RecordTransportAttendanceDto {
  tripId: string;
  studentId: string;
  status: TransportAttendanceStatus;
  notes?: string;
}

export interface VehicleMaintenanceDto {
  id: string;
  schoolId: string;
  vehicleId: string;
  vehicle: {
    registrationNumber: string;
    vehicleCode: string;
  };
  maintenanceType: string;
  description: string;
  cost: number;
  serviceDate: string;
  nextServiceDue?: string | null;
  serviceProvider?: string | null;
  createdAt: string;
}

export interface CreateMaintenanceDto {
  vehicleId: string;
  maintenanceType: string;
  description: string;
  cost?: number;
  serviceDate?: string;
  nextServiceDue?: string;
  serviceProvider?: string;
}

export interface VehicleExpenseDto {
  id: string;
  schoolId: string;
  vehicleId: string;
  vehicle: {
    registrationNumber: string;
    vehicleCode: string;
  };
  expenseType: VehicleExpenseType;
  amount: number;
  date: string;
  receiptNumber?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface CreateExpenseDto {
  vehicleId: string;
  expenseType?: VehicleExpenseType;
  amount: number;
  date?: string;
  receiptNumber?: string;
  description?: string;
}

export interface TransportDashboardSummaryDto {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeRoutes: number;
  assignedStudents: number;
  activeTrips: number;
  attendanceToday: {
    boarded: number;
    droppedOff: number;
    absent: number;
  };
  maintenanceDueCount: number;
  recentTrips: TransportTripDto[];
}

export interface ParentChildTransportDto {
  studentId: string;
  studentName: string;
  allocation?: StudentTransportAllocationDto | null;
  activeTrip?: TransportTripDto | null;
  latestLocation?: VehicleLocationDto | null;
  todayAttendance?: TransportAttendanceDto[];
}

// ==============================================================================
// TASK 028: LIBRARY MANAGEMENT CONTRACTS & DTOS
// ==============================================================================

export type BookCondition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
export type BookCopyStatus = 'AVAILABLE' | 'ISSUED' | 'RESERVED' | 'LOST' | 'DAMAGED' | 'IN_MAINTENANCE';
export type LoanStatus = 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST';
export type ReservationStatus = 'PENDING' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
export type LibraryFineStatus = 'UNPAID' | 'PAID' | 'WAIVED' | 'PARTIAL';

export interface LibraryBookDto {
  id: string;
  schoolId: string;
  title: string;
  isbn?: string | null;
  author: string;
  publisher?: string | null;
  category: string;
  subject?: string | null;
  language: string;
  edition?: string | null;
  publicationYear?: number | null;
  description?: string | null;
  coverImage?: string | null;
  totalCopies: number;
  availableCopies: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  copies?: BookCopyDto[];
}

export interface CreateBookDto {
  title: string;
  isbn?: string;
  author: string;
  publisher?: string;
  category?: string;
  subject?: string;
  language?: string;
  edition?: string;
  publicationYear?: number;
  description?: string;
  coverImage?: string;
}

export interface UpdateBookDto extends Partial<CreateBookDto> {
  isArchived?: boolean;
}

export interface BookCopyDto {
  id: string;
  schoolId: string;
  bookId: string;
  accessionNumber: string;
  barcode?: string | null;
  shelfLocation?: string | null;
  acquisitionDate: string;
  condition: BookCondition;
  status: BookCopyStatus;
  createdAt: string;
  updatedAt: string;
  book?: {
    id: string;
    title: string;
    author: string;
    isbn?: string | null;
  };
  currentLoan?: BookLoanDto | null;
}

export interface CreateBookCopyDto {
  bookId: string;
  accessionNumber: string;
  barcode?: string;
  shelfLocation?: string;
  acquisitionDate?: string;
  condition?: BookCondition;
}

export interface UpdateBookCopyDto {
  shelfLocation?: string;
  condition?: BookCondition;
  status?: BookCopyStatus;
}

export interface BookLoanDto {
  id: string;
  schoolId: string;
  bookId: string;
  book: {
    id: string;
    title: string;
    author: string;
    isbn?: string | null;
  };
  copyId: string;
  copy: {
    id: string;
    accessionNumber: string;
    barcode?: string | null;
    shelfLocation?: string | null;
  };
  borrowerType: 'STUDENT' | 'TEACHER';
  borrowerId: string;
  borrower: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  issueDate: string;
  dueDate: string;
  returnDate?: string | null;
  renewCount: number;
  status: LoanStatus;
  returnCondition?: BookCondition | null;
  issuedById?: string | null;
  returnedById?: string | null;
  notes?: string | null;
  fine?: LibraryFineDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueBookDto {
  bookId?: string;
  copyId: string;
  borrowerId: string;
  borrowerType?: 'STUDENT' | 'TEACHER';
  dueDate?: string;
  notes?: string;
}

export interface ReturnBookDto {
  loanId: string;
  returnCondition?: BookCondition;
  notes?: string;
}

export interface RenewLoanDto {
  loanId: string;
  newDueDate?: string;
}

export interface BookReservationDto {
  id: string;
  schoolId: string;
  bookId: string;
  book: {
    id: string;
    title: string;
    author: string;
  };
  borrowerType: 'STUDENT' | 'TEACHER';
  borrowerId: string;
  borrower: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reservationDate: string;
  expiryDate?: string | null;
  queuePosition: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationDto {
  bookId: string;
}

export interface LibraryFineDto {
  id: string;
  schoolId: string;
  loanId: string;
  borrowerType: 'STUDENT' | 'TEACHER';
  borrowerId: string;
  borrower?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  amount: number;
  waivedAmount: number;
  paidAmount: number;
  balanceAmount: number;
  overdueDays: number;
  status: LibraryFineStatus;
  waivedReason?: string | null;
  feeInvoiceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaiveFineDto {
  fineId: string;
  waiveAmount?: number;
  reason: string;
}

export interface LibraryPolicyDto {
  id: string;
  schoolId: string;
  borrowerType: 'STUDENT' | 'TEACHER';
  maxBooks: number;
  loanPeriodDays: number;
  renewalLimit: number;
  finePerDay: number;
  gracePeriodDays: number;
  maxFineAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePolicyDto {
  maxBooks?: number;
  loanPeriodDays?: number;
  renewalLimit?: number;
  finePerDay?: number;
  gracePeriodDays?: number;
  maxFineAmount?: number;
}

export interface LibraryReportsDto {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  overdueLoans: number;
  lostOrDamagedCopies: number;
  activeReservations: number;
  totalFinesAccrued: number;
  outstandingFines: number;
  recentLoans: BookLoanDto[];
}


// ==============================================================================
// Document Intelligence & Administrative Automation Contracts (TASK 026)
// ==============================================================================

export enum DocumentCategory {
  SCHOOL_POLICY = 'SCHOOL_POLICY',
  ATTENDANCE_POLICY = 'ATTENDANCE_POLICY',
  EXAMINATION_GUIDELINE = 'EXAMINATION_GUIDELINE',
  CURRICULUM_DOCUMENT = 'CURRICULUM_DOCUMENT',
  TEACHER_HANDBOOK = 'TEACHER_HANDBOOK',
  STUDENT_HANDBOOK = 'STUDENT_HANDBOOK',
  PARENT_GUIDELINE = 'PARENT_GUIDELINE',
  FEE_POLICY = 'FEE_POLICY',
  TRANSPORT_SAFETY_POLICY = 'TRANSPORT_SAFETY_POLICY',
  LIBRARY_RULE = 'LIBRARY_RULE',
  ADMINISTRATIVE_CIRCULAR = 'ADMINISTRATIVE_CIRCULAR',
  GENERAL_INSTITUTIONAL = 'GENERAL_INSTITUTIONAL',
}

export enum DocumentProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentDraftStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
}

export interface DocumentSectionDto {
  id: string;
  documentId: string;
  sectionIndex: number;
  title?: string | null;
  content: string;
  pageNumber?: number | null;
  tokenCount?: number | null;
  createdAt: string;
}

export interface DocumentVersionHistoryDto {
  id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string;
  fileSize: number;
  changeSummary?: string | null;
  uploadedById: string;
  uploadedByName?: string;
  createdAt: string;
}

export interface InstitutionalDocumentDto {
  id: string;
  schoolId?: string | null;
  schoolName?: string | null;
  title: string;
  description?: string | null;
  category: DocumentCategory;
  documentType: string;
  fileUrl: string;
  fileSize: number;
  version: number;
  status: DocumentProcessingStatus;
  isPublished: boolean;
  visibilityRoles: UserRole[];
  uploadedById: string;
  uploadedByName?: string;
  sectionCount?: number;
  sections?: DocumentSectionDto[];
  versions?: DocumentVersionHistoryDto[];
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentDto {
  title: string;
  description?: string;
  category: DocumentCategory;
  documentType: 'PDF' | 'DOCX' | 'TXT';
  fileContentBase64?: string;
  textContent?: string;
  fileName?: string;
  fileSize?: number;
  visibilityRoles?: UserRole[];
  isPublished?: boolean;
  schoolId?: string;
}

export interface UpdateDocumentDto {
  title?: string;
  description?: string;
  category?: DocumentCategory;
  visibilityRoles?: UserRole[];
  isPublished?: boolean;
}

export interface ReplaceDocumentVersionDto {
  fileContentBase64?: string;
  textContent?: string;
  fileName?: string;
  fileSize?: number;
  changeSummary: string;
}

export interface DocumentFilterDto {
  category?: DocumentCategory;
  schoolId?: string;
  isPublished?: boolean;
  visibilityRole?: UserRole;
  status?: DocumentProcessingStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DocumentApprovalDraftDto {
  id: string;
  schoolId?: string | null;
  schoolName?: string | null;
  authorId: string;
  authorName?: string;
  sourceDocumentId?: string | null;
  sourceDocumentTitle?: string | null;
  category: string;
  targetRole: string;
  classSectionId?: string | null;
  classSectionName?: string | null;
  subject: string;
  body: string;
  status: DocumentDraftStatus;
  rejectionReason?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  publishedAnnouncementId?: string | null;
  version: number;
  history?: any[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentDraftDto {
  sourceDocumentId?: string;
  category: string;
  targetRole?: string;
  classSectionId?: string;
  subject: string;
  body: string;
}

export interface UpdateDocumentDraftDto {
  subject?: string;
  body?: string;
  targetRole?: string;
  category?: string;
  classSectionId?: string;
}

export interface ReviewDocumentDraftDto {
  decision: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export interface PublishDocumentDraftDto {
  confirmDispatch: boolean;
}

export interface DocumentSearchQueryDto {
  query: string;
  category?: DocumentCategory;
  limit?: number;
}

export interface DocumentSearchResultItemDto {
  documentId: string;
  documentTitle: string;
  category: DocumentCategory;
  version: number;
  sectionIndex: number;
  pageNumber?: number | null;
  snippet: string;
  relevanceScore?: number;
}

export interface DocumentSummaryRequestDto {
  documentId: string;
  summaryType?: 'SHORT' | 'DETAILED' | 'KEY_POINTS' | 'ACTION_ITEMS' | 'STAFF' | 'PARENT' | 'STUDENT';
}

export interface NarrativeReportRequestDto {
  reportType: 'ATTENDANCE_SUMMARY' | 'FEE_COLLECTION' | 'ACADEMIC_PERFORMANCE' | 'TRANSPORT_OPERATIONS' | 'LIBRARY_CIRCULATION';
  dateFrom?: string;
  dateTo?: string;
  schoolId?: string;
}

