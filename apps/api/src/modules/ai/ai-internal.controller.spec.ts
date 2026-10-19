/**
 * MODULE: Internal AI Tools Controller - Unit Tests
 *
 * PURPOSE:
 * Verifies security boundary enforcement for inter-service communication (SEC-002 Hardening).
 * Ensures that service-to-service endpoints cannot be accessed without valid authorization,
 * rejects development fallbacks in production, and prevents timing attacks.
 *
 * DEPENDENCIES:
 * @nestjs/testing, AiInternalController, AiToolsService, ConfigService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiInternalController } from './ai-internal.controller';
import { AiToolsService } from './ai-tools.service';
import { UserRole } from '@ems/contracts';

describe('AiInternalController (SEC-002 Hardening)', () => {
  let controller: AiInternalController;
  let aiToolsService: any;
  let configService: any;

  const validProductionSecret = 'prod_super_secure_random_internal_secret_key_32chars';

  const mockPayload = {
    toolName: 'query_grades',
    userId: 'user-uuid-1',
    role: UserRole.TEACHER,
    schoolId: 'school-uuid-1',
    args: { query: 'grade distribution' },
  };

  beforeEach(async () => {
    aiToolsService = {
      executeTool: jest.fn().mockResolvedValue({ success: true, data: { count: 42 } }),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'INTERNAL_SERVICE_SECRET') return validProductionSecret;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiInternalController],
      providers: [
        { provide: AiToolsService, useValue: aiToolsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<AiInternalController>(AiInternalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should allow tool execution when provided secret matches valid configured secret', async () => {
    const result = await controller.executeTool(
      'query_grades',
      validProductionSecret,
      mockPayload,
    );

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(aiToolsService.executeTool).toHaveBeenCalledWith(
      'query_grades',
      { userId: mockPayload.userId, role: mockPayload.role, schoolId: mockPayload.schoolId },
      mockPayload.args,
    );
  });

  it('should reject requests with missing or empty internal secret header', async () => {
    await expect(
      controller.executeTool('query_grades', '', mockPayload),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      controller.executeTool('query_grades', null as any, mockPayload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject requests with invalid secret', async () => {
    await expect(
      controller.executeTool('query_grades', 'invalid_secret_key', mockPayload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject requests in production if INTERNAL_SERVICE_SECRET is unset or empty', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'INTERNAL_SERVICE_SECRET') return '';
      return null;
    });

    await expect(
      controller.executeTool('query_grades', validProductionSecret, mockPayload),
    ).rejects.toThrow(/insecurely configured/);
  });

  it('should reject requests in production if INTERNAL_SERVICE_SECRET is using development default fallback', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'INTERNAL_SERVICE_SECRET') return 'dev_internal_secret_key_change_in_production';
      return null;
    });

    await expect(
      controller.executeTool(
        'query_grades',
        'dev_internal_secret_key_change_in_production',
        mockPayload,
      ),
    ).rejects.toThrow(/insecurely configured or using development fallback/);
  });

  it('should reject requests in production if INTERNAL_SERVICE_SECRET is shorter than 16 characters', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'INTERNAL_SERVICE_SECRET') return 'short_sec';
      return null;
    });

    await expect(
      controller.executeTool('query_grades', 'short_sec', mockPayload),
    ).rejects.toThrow(/insecurely configured/);
  });
});
