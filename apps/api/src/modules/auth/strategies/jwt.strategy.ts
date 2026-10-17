/**
 * MODULE: Authentication - JWT Strategy
 *
 * PURPOSE:
 * Extracts and cryptographically verifies Bearer JWT tokens in authorization headers.
 * Resolves active institutional user and verifies account status against database.
 *
 * DEPENDENCIES:
 * @nestjs/passport, passport-jwt, PrismaService, ConfigService
 *
 * SECURITY:
 * Rejects inactive accounts and verifies signature validity.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, AuthUser, UserRole } from '@ems/contracts';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super_secret_jwt_access_key_ems_institutional_2026',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive or no longer exists.');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as unknown as UserRole,
      schoolId: user.schoolId,
      school: user.school
        ? {
            id: user.school.id,
            name: user.school.name,
            code: user.school.code,
          }
        : null,
      avatarUrl: user.avatarUrl,
    };
  }
}
