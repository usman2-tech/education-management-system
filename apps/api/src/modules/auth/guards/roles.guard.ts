/**
 * MODULE: Authentication - Roles Guard
 *
 * PURPOSE:
 * Enforces Role-Based Access Control (RBAC) across five institutional roles:
 * PLATFORM_ADMIN, SCHOOL_ADMIN, TEACHER, STUDENT, PARENT.
 *
 * DEPENDENCIES:
 * @nestjs/core Reflector, ROLES_KEY
 *
 * SECURITY:
 * PLATFORM_ADMIN bypasses role restrictions as global institutional superintendent.
 * Non-platform users must strictly possess one of the required endpoint roles.
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@ems/contracts';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific roles are required, allow request to proceed
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: Unauthenticated user context.');
    }

    // PLATFORM_ADMIN possesses universal institutional supervisory access
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Role '${user.role}' lacks permissions for this institutional resource. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
