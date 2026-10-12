/**
 * MODULE: Authentication - Core Auth Service
 *
 * PURPOSE:
 * Implements authentication business logic: credential verification, JWT issuance,
 * cryptographically secure token rotation, institutional tenant resolution, and session management.
 *
 * DEPENDENCIES:
 * @nestjs/jwt, @nestjs/config, PrismaService, bcryptjs, crypto
 *
 * SECURITY:
 * Password verification via constant-time bcrypt comparison.
 * Refresh tokens hashed via SHA-256 with rotation and instant revocation support.
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import {
  AuthResponse,
  AuthTokens,
  AuthUser,
  JwtPayload,
  UserRole,
} from '@ems/contracts';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates user credentials and returns full user with tenant relation
   */
  async validateUser(email: string, pass: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    if (!user) {
      throw new UnauthorizedException('Invalid institutional credentials.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Institutional user account is deactivated.');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid institutional credentials.');
    }

    // Update last login timestamp asynchronously
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch((err) => {
      this.logger.warn(`Failed to update lastLoginAt for user ${user.id}: ${err.message}`);
    });

    return user;
  }

  /**
   * Authenticates user and generates institutional access + refresh tokens
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const authUser: AuthUser = {
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

    const tokens = await this.generateTokens(authUser);

    this.logger.log(`User ${user.email} [${user.role}] successfully authenticated.`);

    return {
      user: authUser,
      tokens,
    };
  }

  /**
   * Rotates refresh token and generates fresh access token
   */
  async refreshToken(refreshTokenStr: string): Promise<AuthTokens> {
    if (!refreshTokenStr) {
      throw new BadRequestException('Refresh token is required.');
    }

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super_secret_jwt_refresh_key_ems_institutional_2026';

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshTokenStr, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Hash token to verify against active database records
    const tokenHash = this.hashToken(refreshTokenStr);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has been revoked or expired.');
    }

    // Revoke old token as part of rotation strategy
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Fetch user with tenant
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is invalid or deactivated.');
    }

    const authUser: AuthUser = {
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

    return this.generateTokens(authUser);
  }

  /**
   * Logs out user by revoking refresh tokens
   */
  async logout(userId: string, refreshTokenStr?: string): Promise<{ success: boolean; message: string }> {
    if (refreshTokenStr) {
      const tokenHash = this.hashToken(refreshTokenStr);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { revoked: true },
      });
    } else {
      // Revoke all tokens for the user
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    }

    this.logger.log(`Session terminated for user ${userId}.`);
    return { success: true, message: 'Logged out successfully.' };
  }

  /**
   * Resolves current authenticated user profile
   */
  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User profile not found.');
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

  /**
   * Generates paired JWT access and refresh tokens
   */
  private async generateTokens(user: AuthUser): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    };

    const accessSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'super_secret_jwt_access_key_ems_institutional_2026';
    const accessExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '1h';

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super_secret_jwt_refresh_key_ems_institutional_2026';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(
        { ...payload, jti: crypto.randomUUID() },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    // Calculate expiration date for refresh token (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store hashed refresh token in database
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        revoked: false,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Cryptographically hashes a token string for safe persistence
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
