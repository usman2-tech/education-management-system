/**
 * UNIT TESTS: SubscriptionCodesService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionCodesService } from './subscription-codes.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('SubscriptionCodesService', () => {
  let service: SubscriptionCodesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      subscriptionPlan: {
        findUnique: jest.fn(),
      },
      school: {
        findUnique: jest.fn(),
      },
      subscriptionCode: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      codeRedemption: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionCodesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SubscriptionCodesService>(SubscriptionCodesService);
  });

  it('should allow platform admin to bulk generate activation codes', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      name: 'Pro Tier',
    });
    prisma.subscriptionCode.create.mockImplementation(({ data }: any) => ({
      id: 'code-id-1',
      ...data,
      plan: { name: 'Pro Tier' },
      school: null,
      createdAt: new Date(),
    }));

    const futureDate = new Date(Date.now() + 60 * 86400000).toISOString();

    const result = await service.generateCodes(
      { id: 'admin-1', role: UserRole.PLATFORM_ADMIN },
      {
        planId: 'plan-1',
        count: 3,
        prefix: 'STEM',
        maxRedemptions: 1,
        expiresAt: futureDate,
      },
    );

    expect(result.length).toBe(3);
    expect(result[0].code).toMatch(/^STEM-/);
    expect(prisma.subscriptionCode.create).toHaveBeenCalledTimes(3);
  });

  it('should forbid non-platform admin from generating codes', async () => {
    await expect(
      service.generateCodes(
        { id: 'student-1', role: UserRole.STUDENT },
        {
          planId: 'plan-1',
          count: 1,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should successfully redeem a valid activation code and record redemption', async () => {
    const codeObj = {
      id: 'code-1',
      code: 'EMS-ABCD-1234-EFGH',
      planId: 'plan-1',
      schoolId: null,
      maxRedemptions: 5,
      timesRedeemed: 1,
      expiresAt: new Date(Date.now() + 30 * 86400000),
      isRevoked: false,
      plan: { name: 'Full Curriculum' },
      school: null,
      redemptions: [], // no prior redemption by this user
    };

    prisma.subscriptionCode.findUnique.mockResolvedValue(codeObj);

    const updatedCode = { ...codeObj, timesRedeemed: 2 };
    const redemptionRecord = {
      id: 'red-1',
      codeId: 'code-1',
      userId: 'student-1',
      schoolId: 'school-1',
      redeemedAt: new Date(),
      code: { code: 'EMS-ABCD-1234-EFGH', plan: { name: 'Full Curriculum' } },
      user: { firstName: 'Ali', lastName: 'Khan', email: 'ali@school.org' },
      school: { name: 'Al-Taibah Academy' },
    };

    prisma.$transaction.mockResolvedValue([updatedCode, redemptionRecord]);

    const res = await service.redeemCode(
      { id: 'student-1', role: UserRole.STUDENT, schoolId: 'school-1' },
      { code: 'EMS-ABCD-1234-EFGH' },
    );

    expect(res.success).toBe(true);
    expect(res.redemption.codeValue).toBe('EMS-ABCD-1234-EFGH');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should reject non-existent code with NotFoundException', async () => {
    prisma.subscriptionCode.findUnique.mockResolvedValue(null);

    await expect(
      service.redeemCode(
        { id: 'student-1', role: UserRole.STUDENT, schoolId: 'school-1' },
        { code: 'NONEXISTENT-CODE' },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject expired activation code', async () => {
    prisma.subscriptionCode.findUnique.mockResolvedValue({
      id: 'code-expired',
      code: 'EMS-OLDD-1111-2222',
      isRevoked: false,
      expiresAt: new Date(Date.now() - 86400000), // past
      maxRedemptions: 1,
      timesRedeemed: 0,
      redemptions: [],
    });

    await expect(
      service.redeemCode(
        { id: 'student-1', role: UserRole.STUDENT, schoolId: 'school-1' },
        { code: 'EMS-OLDD-1111-2222' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject revoked activation code', async () => {
    prisma.subscriptionCode.findUnique.mockResolvedValue({
      id: 'code-revoked',
      code: 'EMS-REV0-0000-0000',
      isRevoked: true,
      expiresAt: new Date(Date.now() + 86400000),
      maxRedemptions: 10,
      timesRedeemed: 0,
      redemptions: [],
    });

    await expect(
      service.redeemCode(
        { id: 'student-1', role: UserRole.STUDENT, schoolId: 'school-1' },
        { code: 'EMS-REV0-0000-0000' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject code that reached maximum redemptions', async () => {
    prisma.subscriptionCode.findUnique.mockResolvedValue({
      id: 'code-full',
      code: 'EMS-FULL-9999-9999',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000),
      maxRedemptions: 1,
      timesRedeemed: 1, // at max
      redemptions: [],
    });

    await expect(
      service.redeemCode(
        { id: 'student-1', role: UserRole.STUDENT, schoolId: 'school-1' },
        { code: 'EMS-FULL-9999-9999' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject duplicate redemption if user already redeemed the code', async () => {
    prisma.subscriptionCode.findUnique.mockResolvedValue({
      id: 'code-dupe',
      code: 'EMS-DUPE-5555-5555',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000),
      maxRedemptions: 10,
      timesRedeemed: 1,
      redemptions: [{ id: 'existing-redemption', userId: 'student-1' }], // already redeemed
    });

    await expect(
      service.redeemCode(
        { id: 'student-1', role: UserRole.STUDENT, schoolId: 'school-1' },
        { code: 'EMS-DUPE-5555-5555' },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject redemption if code has school-specific restriction and user belongs to different school', async () => {
    prisma.subscriptionCode.findUnique.mockResolvedValue({
      id: 'code-restricted',
      code: 'EMS-REST-1234-5678',
      schoolId: 'school-A',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000),
      maxRedemptions: 5,
      timesRedeemed: 0,
      redemptions: [],
    });

    await expect(
      service.redeemCode(
        { id: 'student-1', role: UserRole.STUDENT, schoolId: 'school-B' }, // different school
        { code: 'EMS-REST-1234-5678' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
