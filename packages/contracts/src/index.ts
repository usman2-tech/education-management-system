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


