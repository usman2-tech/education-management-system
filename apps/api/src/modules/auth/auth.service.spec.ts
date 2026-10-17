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
});
