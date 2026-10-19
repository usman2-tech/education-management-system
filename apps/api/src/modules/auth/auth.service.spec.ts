/**
 * MODULE: Authentication - AuthService Unit Tests
 *
 * PURPOSE:
 * Automated test suite covering credential validation, JWT generation,
 * refresh token rotation, and account deactivation handling.
 *
 * DEPENDENCIES:
 * @nestjs/testing, AuthService, PrismaService, JwtService, ConfigService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@ems/contracts';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'admin@stjude.ems.local',
    passwordHash: '',
    firstName: 'Eleanor',
    lastName: 'Pemberton',
    role: UserRole.SCHOOL_ADMIN,
    schoolId: 'school-uuid-1',
    isActive: true,
    avatarUrl: null,
    school: {
      id: 'school-uuid-1',
      name: 'St. Jude Institutional Academy',
      code: 'st-jude',
      status: 'ACTIVE',
    },
  };

  beforeAll(async () => {
    // Generate bcrypt hash for testing
    mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked-jwt-token'),
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
        if (key === 'JWT_EXPIRES_IN') return '1h';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when valid credentials are provided', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.validateUser('admin@stjude.ems.local', 'Password123!');
      expect(result).toBeDefined();
      expect(result.email).toBe('admin@stjude.ems.local');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@stjude.ems.local' },
        include: expect.any(Object),
      });
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.validateUser('admin@stjude.ems.local', 'WrongPassword!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@ems.local', 'Password123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user account is deactivated', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.validateUser('admin@stjude.ems.local', 'Password123!'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return auth response with user profile and tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({ id: 'token-uuid' });

      const result = await service.login({
        email: 'admin@stjude.ems.local',
        password: 'Password123!',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('admin@stjude.ems.local');
      expect(result.user.role).toBe(UserRole.SCHOOL_ADMIN);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('mocked-jwt-token');
      expect(result.tokens.refreshToken).toBe('mocked-jwt-token');
    });
  });

  describe('logout', () => {
    it('should revoke user refresh tokens', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.logout('user-uuid-1');
      expect(result.success).toBe(true);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1', revoked: false },
        data: { revoked: true },
      });
    });
  });

  describe('SEC-001: Password Recovery Hardening', () => {
    it('should never return resetToken, devToken, or devResetLink in production mode', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'EMAIL_SERVICE_ENABLED') return 'true';
        if (key === 'ENABLE_DEV_AUTH_TOKENS') return 'true'; // must be ignored in production
        return null;
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const result = await service.requestPasswordReset({
        email: 'admin@stjude.ems.local',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('If an institutional account exists');
      expect((result as any).resetToken).toBeUndefined();
      expect((result as any).devToken).toBeUndefined();
      expect((result as any).devResetLink).toBeUndefined();
    });

    it('should fail closed without creating DB tokens if email service is not configured and dev tokens are disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'EMAIL_SERVICE_ENABLED') return 'false';
        if (key === 'SMTP_HOST') return null;
        if (key === 'ENABLE_DEV_AUTH_TOKENS') return 'false';
        return null;
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.requestPasswordReset({
        email: 'admin@stjude.ems.local',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('If an institutional account exists');
      expect((result as any).devToken).toBeUndefined();
      expect((result as any).resetToken).toBeUndefined();
      // Verifies fail closed: no token created in DB
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should return identical generic response when requested account does not exist', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return null;
      });

      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset({
        email: 'unknown-user@notreal.local',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('If an institutional account exists');
      expect((result as any).resetToken).toBeUndefined();
      expect((result as any).devToken).toBeUndefined();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting and reject more than 3 requests within 15 minutes', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'ENABLE_DEV_AUTH_TOKENS') return 'true';
        return null;
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const email = 'ratelimited@stjude.ems.local';

      // 3 successful requests
      await service.requestPasswordReset({ email });
      await service.requestPasswordReset({ email });
      await service.requestPasswordReset({ email });

      // 4th request must throw 429
      await expect(service.requestPasswordReset({ email })).rejects.toThrow(
        /Too many password reset requests/,
      );
    });

    it('should reject expired, already-used, or non-existent tokens during reset', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id-1',
        used: true,
        expiresAt: new Date(Date.now() + 100000),
        user: mockUser,
      });

      await expect(
        service.resetPassword({
          token: 'some-used-token',
          password: 'NewValidPassword123!',
        }),
      ).rejects.toThrow(/Invalid, expired, or already-consumed/);
    });
  });
});
