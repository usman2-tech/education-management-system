/**
 * UNIT TESTS: SubscriptionsService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole, SubscriptionStatus } from '@prisma/client';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      subscriptionPlan: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      school: {
        findUnique: jest.fn(),
      },
      schoolSubscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  it('should allow platform admin to create a subscription plan', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
    prisma.subscriptionPlan.create.mockResolvedValue({
      id: 'plan-1',
      name: 'Enterprise Tier',
      code: 'ENTERPRISE',
      price: 2999.0,
      currency: 'USD',
      durationDays: 365,
      maxStudents: 2000,
      maxTeachers: 100,
      features: JSON.stringify(['ALL_FEATURES']),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await service.createPlan(
      { id: 'admin-1', role: UserRole.PLATFORM_ADMIN },
      {
        name: 'Enterprise Tier',
        code: 'ENTERPRISE',
        price: 2999.0,
        durationDays: 365,
        maxStudents: 2000,
        maxTeachers: 100,
        features: ['ALL_FEATURES'],
      },
    );

    expect(res.name).toBe('Enterprise Tier');
    expect(res.code).toBe('ENTERPRISE');
    expect(prisma.subscriptionPlan.create).toHaveBeenCalled();
  });

  it('should throw BadRequestException if plan code already exists', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'existing-plan' });

    await expect(
      service.createPlan(
        { id: 'admin-1', role: UserRole.PLATFORM_ADMIN },
        {
          name: 'Dupe Plan',
          code: 'ENTERPRISE',
          price: 100,
          durationDays: 30,
          maxStudents: 50,
          maxTeachers: 5,
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should forbid non-platform admin from creating plans', async () => {
    await expect(
      service.createPlan(
        { id: 'school-admin-1', role: UserRole.SCHOOL_ADMIN },
        {
          name: 'Basic',
          code: 'BASIC',
          price: 500,
          durationDays: 365,
          maxStudents: 100,
          maxTeachers: 10,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should assign a subscription plan to a school and expire previous active records', async () => {
    prisma.school.findUnique.mockResolvedValue({ id: 'school-1', name: 'Al-Taibah Academy' });
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      name: 'Standard Tier',
      durationDays: 365,
      maxStudents: 500,
      maxTeachers: 50,
    });
    prisma.schoolSubscription.updateMany.mockResolvedValue({ count: 1 });
    prisma.schoolSubscription.create.mockResolvedValue({
      id: 'sub-1',
      schoolId: 'school-1',
      planId: 'plan-1',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 86400000),
      autoRenew: true,
      school: { name: 'Al-Taibah Academy' },
      plan: { name: 'Standard Tier', code: 'STANDARD', maxStudents: 500, maxTeachers: 50 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await service.assignSchoolSubscription(
      { id: 'admin-1', role: UserRole.PLATFORM_ADMIN, schoolId: null },
      {
        schoolId: 'school-1',
        planId: 'plan-1',
        autoRenew: true,
      },
    );

    expect(res.status).toBe(SubscriptionStatus.ACTIVE);
    expect(res.schoolName).toBe('Al-Taibah Academy');
    expect(prisma.schoolSubscription.updateMany).toHaveBeenCalledWith({
      where: { schoolId: 'school-1', status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.EXPIRED },
    });
  });

  it('should allow school admin to renew their own subscription', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000);
    prisma.schoolSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      schoolId: 'school-1',
      status: SubscriptionStatus.ACTIVE,
      endDate: futureDate,
      plan: { durationDays: 365, name: 'Standard' },
    });
    prisma.schoolSubscription.update.mockResolvedValue({
      id: 'sub-1',
      schoolId: 'school-1',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(futureDate.getTime() + 365 * 86400000),
      autoRenew: false,
      school: { name: 'Al-Taibah Academy' },
      plan: { name: 'Standard', code: 'STANDARD', maxStudents: 500, maxTeachers: 50 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await service.renewSubscription(
      { id: 'admin-2', role: UserRole.SCHOOL_ADMIN, schoolId: 'school-1' },
      'sub-1',
    );

    expect(res.status).toBe(SubscriptionStatus.ACTIVE);
    expect(prisma.schoolSubscription.update).toHaveBeenCalled();
  });

  it('should forbid school admin from renewing subscription of another school', async () => {
    prisma.schoolSubscription.findUnique.mockResolvedValue({
      id: 'sub-99',
      schoolId: 'other-school',
      status: SubscriptionStatus.ACTIVE,
      endDate: new Date(),
      plan: { durationDays: 365 },
    });

    await expect(
      service.renewSubscription(
        { id: 'admin-2', role: UserRole.SCHOOL_ADMIN, schoolId: 'school-1' },
        'sub-99',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should compute overview metrics with real counts for platform administrator', async () => {
    const now = new Date();
    prisma.schoolSubscription.findMany.mockResolvedValue([
      {
        id: 's-1',
        schoolId: 'sch-1',
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date(now.getTime() + 100 * 86400000),
        school: { name: 'School 1' },
        plan: { name: 'Pro' },
      },
      {
        id: 's-2',
        schoolId: 'sch-2',
        status: SubscriptionStatus.EXPIRED,
        endDate: new Date(now.getTime() - 10 * 86400000),
        school: { name: 'School 2' },
        plan: { name: 'Basic' },
      },
      {
        id: 's-3',
        schoolId: 'sch-3',
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date(now.getTime() + 15 * 86400000), // expiring in 15 days
        school: { name: 'School 3' },
        plan: { name: 'Starter' },
      },
    ]);

    const overview = await service.getSubscriptionOverview({
      id: 'admin-1',
      role: UserRole.PLATFORM_ADMIN,
      schoolId: null,
    });

    expect(overview.totalSubscriptions).toBe(3);
    expect(overview.activeCount).toBe(2);
    expect(overview.expiredCount).toBe(1);
    expect(overview.expiringSoonCount).toBe(1);
  });
});
