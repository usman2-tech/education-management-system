/**
 * MODULE: Authentication - School Isolation Guard
 *
 * PURPOSE:
 * Enforces strict multi-tenant institutional isolation at the API boundary.
 * Prevents cross-school unauthorized data leakage between institutions.
 *
 * DEPENDENCIES:
 * @nestjs/common, @ems/contracts
 *
 * SECURITY:
 * PLATFORM_ADMIN can access any school context.
 * SCHOOL_ADMIN, TEACHER, STUDENT, PARENT are strictly locked to their assigned schoolId.
 * Any request attempting cross-tenant access is rejected with HTTP 403 Forbidden.
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@ems/contracts';

@Injectable()
export class SchoolIsolationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied: Unauthenticated user context.');
    }

    // Platform Admins have multi-institutional authority across schools
    if (user.role === UserRole.PLATFORM_ADMIN) {
      // If a schoolId is passed in param or query,Platform Admin can act on it
      request.activeSchoolId = request.params?.schoolId || request.query?.schoolId || null;
      return true;
    }

    // All school-level roles MUST possess a valid schoolId
    if (!user.schoolId) {
      throw new ForbiddenException('Access denied: User is not associated with an active institutional tenant.');
    }

    // Attach verified schoolId to request for downstream controller/service usage
    request.activeSchoolId = user.schoolId;

    // Check if the route specifies a target schoolId in route params
    const paramSchoolId = request.params?.schoolId;
    if (paramSchoolId && paramSchoolId !== user.schoolId) {
      throw new ForbiddenException('Access denied: Cross-institutional data access is strictly prohibited.');
    }

    // Check query params if schoolId is specified
    const querySchoolId = request.query?.schoolId;
    if (querySchoolId && querySchoolId !== user.schoolId) {
      throw new ForbiddenException('Access denied: Querying data for another institutional tenant is forbidden.');
    }

    return true;
  }
}
