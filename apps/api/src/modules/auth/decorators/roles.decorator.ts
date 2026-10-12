/**
 * MODULE: Authentication - Roles Decorator
 *
 * PURPOSE:
 * Attaches metadata specifying roles authorized to access an endpoint.
 *
 * DEPENDENCIES:
 * @nestjs/common, @prisma/client
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
