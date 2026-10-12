/**
 * MODULE: Authentication - JWT Auth Guard
 *
 * PURPOSE:
 * Enforces valid Bearer JWT authentication on protected routes.
 *
 * DEPENDENCIES:
 * @nestjs/passport
 */

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  override handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Authentication required.');
    }
    return user;
  }
}
