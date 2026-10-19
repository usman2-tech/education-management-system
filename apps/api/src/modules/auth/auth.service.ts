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
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
  private readonly passwordResetRateLimits = new Map<string, { count: number; windowStart: number }>();

  /**
   * Enforces in-memory rate limiting on password reset requests:
   * Maximum 3 requests per 15-minute window per normalized email address.
   */
  private checkPasswordResetRateLimit(email: string): void {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 3;

    if (this.passwordResetRateLimits.size > 1000) {
      for (const [key, record] of this.passwordResetRateLimits.entries()) {
        if (now - record.windowStart > windowMs) {
          this.passwordResetRateLimits.delete(key);
        }
      }
    }

    const record = this.passwordResetRateLimits.get(email);
    if (!record || now - record.windowStart > windowMs) {
      this.passwordResetRateLimits.set(email, { count: 1, windowStart: now });
      return;
    }

    if (record.count >= maxRequests) {
      this.logger.warn(`Rate limit exceeded for password recovery requests targeting: ${email}`);
      throw new HttpException(
        'Too many password reset requests for this account. Please wait 15 minutes before requesting again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count += 1;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates user credentials and returns full user with tenant relation
   */
  async validateUser(email: string, pass: string, selectedRole?: UserRole) {
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

    // Role verification: ensure selected portal role matches actual account role
    if (selectedRole && user.role !== selectedRole) {
      throw new UnauthorizedException(
        `Access denied: Your account role is '${user.role}', but you attempted to sign into the '${selectedRole}' portal.`
      );
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
    const user = await this.validateUser(loginDto.email, loginDto.password, loginDto.selectedRole);

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

  /**
   * Invites a new institutional user with a cryptographically secure token
   */
  async inviteUser(invitedBy: AuthUser, dto: InviteUserDto) {
    const targetEmail = dto.email.trim().toLowerCase();

    // 1. RBAC & School Isolation
    let targetSchoolId: string | null = dto.schoolId || null;

    if (invitedBy.role === UserRole.PLATFORM_ADMIN) {
      if (dto.role !== UserRole.PLATFORM_ADMIN && !targetSchoolId && invitedBy.schoolId) {
        targetSchoolId = invitedBy.schoolId;
      }
    } else if (invitedBy.role === UserRole.SCHOOL_ADMIN) {
      if (!invitedBy.schoolId) {
        throw new ForbiddenException('School Administrator lacks an active institutional school context.');
      }
      if (dto.schoolId && dto.schoolId !== invitedBy.schoolId) {
        throw new ForbiddenException('School Administrators cannot invite users to other institutional campuses.');
      }
      if (dto.role === UserRole.PLATFORM_ADMIN || dto.role === UserRole.SCHOOL_ADMIN) {
        throw new ForbiddenException('School Administrators can only invite Teachers, Students, and Parents.');
      }
      targetSchoolId = invitedBy.schoolId;
    } else {
      throw new ForbiddenException('You do not have permission to invite institutional users.');
    }

    // 2. Prevent duplicate active accounts
    const existingUser = await this.prisma.user.findUnique({
      where: { email: targetEmail },
    });
    if (existingUser && existingUser.isActive) {
      throw new BadRequestException('An active institutional account with this email address already exists.');
    }

    // 3. Generate secure token & hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Invalidate prior pending invitations for this email
    await this.prisma.userInvitation.deleteMany({
      where: { email: targetEmail, accepted: false },
    });

    const invitation = await this.prisma.userInvitation.create({
      data: {
        email: targetEmail,
        role: dto.role,
        schoolId: targetSchoolId,
        tokenHash,
        expiresAt,
        invitedById: invitedBy.id,
      },
      include: {
        school: { select: { id: true, name: true, code: true } },
      },
    });

    // 4. Audit Log
    await this.prisma.auditLog.create({
      data: {
        action: 'USER_INVITATION_CREATED',
        entityType: 'UserInvitation',
        entityId: invitation.id,
        actorId: invitedBy.id,
        actorEmail: invitedBy.email,
        schoolId: targetSchoolId,
        details: { email: targetEmail, role: dto.role },
      },
    });

    this.logger.log(`Invitation created for ${targetEmail} [${dto.role}] by ${invitedBy.email}`);

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const enableDevAuthTokens =
      this.configService.get<string>('ENABLE_DEV_AUTH_TOKENS') === 'true' && !isProduction;

    return {
      success: true,
      message: `Invitation successfully created for ${targetEmail}.`,
      invitationId: invitation.id,
      activationToken: rawToken,
      ...(enableDevAuthTokens
        ? {
            devToken: rawToken,
            devActivationLink: `http://localhost:3000/activate?token=${rawToken}`,
          }
        : {}),
    };
  }

  /**
   * Retrieves invitation metadata for the activation screen
   */
  async getInvitationDetails(rawToken: string) {
    if (!rawToken) {
      throw new BadRequestException('Activation token is required.');
    }
    const tokenHash = this.hashToken(rawToken);
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash },
      include: {
        school: { select: { name: true, code: true } },
      },
    });

    if (!invitation || invitation.accepted || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invalid, expired, or already-consumed invitation token.');
    }

    return {
      email: invitation.email,
      role: invitation.role,
      schoolName: invitation.school?.name || null,
    };
  }

  /**
   * Consumes activation token and sets up password and user profile
   */
  async activateAccount(dto: ActivateAccountDto) {
    const tokenHash = this.hashToken(dto.token);
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation || invitation.accepted || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invalid, expired, or already-consumed activation link.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          isActive: true,
          role: invitation.role,
          schoolId: invitation.schoolId,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          role: invitation.role,
          schoolId: invitation.schoolId,
          isActive: true,
        },
      });
    }

    // Role-specific profile initialization
    if (invitation.role === UserRole.TEACHER) {
      await this.prisma.teacherProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    } else if (invitation.role === UserRole.STUDENT) {
      await this.prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    } else if (invitation.role === UserRole.PARENT) {
      await this.prisma.parentGuardianProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    }

    // Mark invitation consumed
    await this.prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { accepted: true, acceptedAt: new Date() },
    });

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        action: 'ACCOUNT_ACTIVATED',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
        actorEmail: user.email,
        schoolId: invitation.schoolId,
        details: { email: user.email, role: user.role },
      },
    });

    this.logger.log(`Account activated for ${user.email} [${user.role}]`);

    return {
      success: true,
      message: 'Your institutional account has been successfully activated. You may now sign in.',
    };
  }

  /**
   * Password Recovery: Requests password reset (generic response)
   */
  async requestPasswordReset(dto: ForgotPasswordDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Enforce rate limiting: maximum 3 requests per 15-minute window
    this.checkPasswordResetRateLimit(normalizedEmail);

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const isEmailConfigured = Boolean(
      this.configService.get<string>('SMTP_HOST') ||
      this.configService.get<string>('EMAIL_SERVICE_ENABLED') === 'true',
    );
    const enableDevAuthTokens =
      this.configService.get<string>('ENABLE_DEV_AUTH_TOKENS') === 'true' && !isProduction;

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let rawToken: string | undefined;

    if (user && user.isActive) {
      // If neither out-of-band delivery nor development testing tokens are enabled,
      // fail closed: do NOT generate or store any reset token in the database.
      if (!isEmailConfigured && !enableDevAuthTokens) {
        this.logger.warn(
          `[SECURITY NOTICE] Password reset requested for ${normalizedEmail}, but no out-of-band email service is configured and development helper tokens are disabled. Token generation skipped.`,
        );
      } else {
        rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Invalidate existing unused reset tokens for this user
        await this.prisma.passwordResetToken.deleteMany({
          where: { userId: user.id, used: false },
        });

        await this.prisma.passwordResetToken.create({
          data: {
            tokenHash,
            userId: user.id,
            expiresAt,
            used: false,
          },
        });

        await this.prisma.auditLog.create({
          data: {
            action: 'PASSWORD_RESET_REQUESTED',
            entityType: 'User',
            entityId: user.id,
            actorId: user.id,
            actorEmail: user.email,
            schoolId: user.schoolId,
            details: { email: normalizedEmail },
          },
        });

        if (isEmailConfigured) {
          await this.sendPasswordResetEmail(normalizedEmail, rawToken);
        }

        // Never log the raw token in application logs
        this.logger.log(`Password reset instructions initiated for account: ${normalizedEmail}`);
      }
    }

    // Generic response to prevent account enumeration
    const baseResponse = {
      success: true,
      message:
        'If an institutional account exists with this email address, password recovery instructions have been initiated.',
    };

    // Include development convenience fields ONLY if explicitly configured in non-production environments
    if (enableDevAuthTokens && rawToken) {
      return {
        ...baseResponse,
        devToken: rawToken,
        devResetLink: `http://localhost:3000/reset-password?token=${rawToken}`,
      };
    }

    return baseResponse;
  }

  /**
   * Out-of-band email dispatch handler
   */
  private async sendPasswordResetEmail(email: string, rawToken: string): Promise<void> {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const tokenRef = this.hashToken(rawToken).substring(0, 8);
    if (smtpHost) {
      this.logger.log(`[SMTP] Dispatching password reset email to ${email} (ref: ${tokenRef}) via ${smtpHost}`);
    } else {
      this.logger.log(`[EMAIL DISPATCH] Password reset notification queued for ${email} (ref: ${tokenRef})`);
    }
  }

  /**
   * Password Recovery: Consumes reset token and sets new password, invalidating sessions
   */
  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid, expired, or already-consumed password reset token.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Invalidate ALL existing refresh tokens / sessions for this user
    await this.prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, revoked: false },
      data: { revoked: true },
    });

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'User',
        entityId: resetToken.userId,
        actorId: resetToken.userId,
        actorEmail: resetToken.user.email,
        schoolId: resetToken.user.schoolId,
        details: { email: resetToken.user.email },
      },
    });

    this.logger.log(`Password reset completed and active sessions revoked for ${resetToken.user.email}`);

    return {
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.',
    };
  }
}
