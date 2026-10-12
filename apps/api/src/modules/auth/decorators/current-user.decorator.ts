/**
 * MODULE: Authentication - Current User Decorator
 *
 * PURPOSE:
 * Extracts the authenticated user entity or user payload attached to the request by JwtAuthGuard.
 *
 * DEPENDENCIES:
 * @nestjs/common
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@ems/contracts';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
