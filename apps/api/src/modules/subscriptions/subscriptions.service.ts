/**
 * MODULE: Subscription Management - Service
 *
 * PURPOSE:
 * Institutional licensing, plan definitions, school subscription assignment,
 * renewal, cancellation, and entitlement enforcement with complete audit logs.
 *
 * DEPENDENCIES:
 * PrismaService, UserRole, SubscriptionStatus
 *
 * SECURITY:
 * Platform Admins control global plans and cross-school licensing.
 * School Admins view and manage their institutional entitlements only.
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, SubscriptionStatus } from '@prisma/client';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  AssignSchoolSubscriptionDto,
  UpdateSchoolSubscriptionDto,
} from './dto/subscriptions.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new subscription plan (Platform Admin only).
   */
  async createPlan(
    currentUser: { id: string; role: UserRole },
    dto: CreateSubscriptionPlanDto,
  ) {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only Platform Administrators can create subscription plans');
    }

    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Subscription plan code '${dto.code}' already exists`);
    }

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description,
        price: dto.price,
        currency: dto.currency || 'USD',
        durationDays: dto.durationDays,
        maxStudents: dto.maxStudents,
        maxTeachers: dto.maxTeachers,
        features: dto.features ? JSON.stringify(dto.features) : null,
        isActive: dto.isActive ?? true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'SUBSCRIPTION_PLAN_CREATED',
        entityType: 'SubscriptionPlan',
        entityId: plan.id,
        actorId: currentUser.id,
        details: { name: plan.name, code: plan.code, price: plan.price },
      },
    });

    return this.formatPlan(plan);
  }

  /**
   * Get all subscription plans.
   */
  async getPlans(includeInactive: boolean = false) {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { price: 'asc' },
    });
    return plans.map((p) => this.formatPlan(p));
  }

  /**
   * Get subscription plan by ID.
   */
  async getPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true, codes: true } } },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return this.formatPlan(plan);
  }

  /**
   * Update subscription plan (Platform Admin only).
   */
  async updatePlan(
    currentUser: { id: string; role: UserRole },
    id: string,
    dto: UpdateSubscriptionPlanDto,
  ) {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only Platform Administrators can edit subscription plans');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency,
        durationDays: dto.durationDays,
        maxStudents: dto.maxStudents,
        maxTeachers: dto.maxTeachers,
        features: dto.features ? JSON.stringify(dto.features) : undefined,
        isActive: dto.isActive,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'SUBSCRIPTION_PLAN_UPDATED',
        entityType: 'SubscriptionPlan',
        entityId: updated.id,
        actorId: currentUser.id,
        details: { name: updated.name, price: updated.price, isActive: updated.isActive },
      },
    });

    return this.formatPlan(updated);
  }

  /**
   * Assign or activate subscription for a school.
   */
  async assignSchoolSubscription(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    dto: AssignSchoolSubscriptionDto,
  ) {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only Platform Administrators can assign subscriptions to schools');
    }

    const school = await this.prisma.school.findUnique({ where: { id: dto.schoolId } });
    if (!school) throw new NotFoundException('School tenant not found');

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    let endDate: Date;
    if (dto.endDate) {
      endDate = new Date(dto.endDate);
    } else {
      endDate = new Date(startDate.getTime() + plan.durationDays * 86400000);
    }

    // Set any existing ACTIVE subscriptions to EXPIRED to maintain single active contract
    await this.prisma.schoolSubscription.updateMany({
      where: { schoolId: dto.schoolId, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    const sub = await this.prisma.schoolSubscription.create({
      data: {
        schoolId: dto.schoolId,
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
        autoRenew: dto.autoRenew ?? false,
      },
      include: {
        school: true,
        plan: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'SCHOOL_SUBSCRIPTION_ASSIGNED',
        entityType: 'SchoolSubscription',
        entityId: sub.id,
        actorId: currentUser.id,
        schoolId: school.id,
        details: {
          schoolName: school.name,
          planName: plan.name,
          endDate: sub.endDate.toISOString(),
        },
      },
    });

    return this.formatSchoolSubscription(sub);
  }

  /**
   * Get subscriptions for a school or list all (if Platform Admin).
   */
  async getSchoolSubscriptions(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    schoolId?: string,
  ) {
    const targetSchoolId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? schoolId
        : currentUser.schoolId;

    const where: any = {};
    if (targetSchoolId) where.schoolId = targetSchoolId;

    const subs = await this.prisma.schoolSubscription.findMany({
      where,
      include: { school: true, plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return subs.map((s) => this.formatSchoolSubscription(s));
  }

  /**
   * Get subscription overview statistics (active, expired, upcoming expiries).
   */
  async getSubscriptionOverview(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
  ) {
    const targetSchoolId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? null
        : currentUser.schoolId;

    const where: any = {};
    if (targetSchoolId) where.schoolId = targetSchoolId;

    const allSubs = await this.prisma.schoolSubscription.findMany({
      where,
      include: { school: true, plan: true },
      orderBy: { endDate: 'asc' },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);

    const active = allSubs.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE && s.endDate >= now,
    );
    const expired = allSubs.filter(
      (s) => s.status === SubscriptionStatus.EXPIRED || s.endDate < now,
    );
    const pending = allSubs.filter((s) => s.status === SubscriptionStatus.PENDING);
    const expiringSoon = active.filter((s) => s.endDate <= thirtyDaysFromNow);

    return {
      totalSubscriptions: allSubs.length,
      activeCount: active.length,
      expiredCount: expired.length,
      pendingCount: pending.length,
      expiringSoonCount: expiringSoon.length,
      expiringSoon: expiringSoon.map((s) => this.formatSchoolSubscription(s)),
      recentSubscriptions: allSubs.slice(0, 10).map((s) => this.formatSchoolSubscription(s)),
    };
  }

  /**
   * Update subscription status (cancel, suspend, activate).
   */
  async updateSubscriptionStatus(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    id: string,
    dto: UpdateSchoolSubscriptionDto,
  ) {
    const sub = await this.prisma.schoolSubscription.findUnique({
      where: { id },
      include: { school: true, plan: true },
    });
    if (!sub) throw new NotFoundException('School subscription not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      sub.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cannot modify subscriptions for other schools');
    }

    const updated = await this.prisma.schoolSubscription.update({
      where: { id },
      data: {
        status: dto.status,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        autoRenew: dto.autoRenew,
      },
      include: { school: true, plan: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'SCHOOL_SUBSCRIPTION_STATUS_UPDATED',
        entityType: 'SchoolSubscription',
        entityId: updated.id,
        actorId: currentUser.id,
        schoolId: updated.schoolId,
        details: { status: updated.status, endDate: updated.endDate.toISOString() },
      },
    });

    return this.formatSchoolSubscription(updated);
  }

  /**
   * Renew subscription (extend by plan duration or specified days).
   */
  async renewSubscription(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    id: string,
  ) {
    const sub = await this.prisma.schoolSubscription.findUnique({
      where: { id },
      include: { school: true, plan: true },
    });
    if (!sub) throw new NotFoundException('School subscription not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      sub.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cannot renew subscriptions for other schools');
    }

    const baseDate = sub.endDate > new Date() ? sub.endDate : new Date();
    const newEndDate = new Date(baseDate.getTime() + sub.plan.durationDays * 86400000);

    const renewed = await this.prisma.schoolSubscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        endDate: newEndDate,
      },
      include: { school: true, plan: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'SCHOOL_SUBSCRIPTION_RENEWED',
        entityType: 'SchoolSubscription',
        entityId: renewed.id,
        actorId: currentUser.id,
        schoolId: renewed.schoolId,
        details: {
          previousEndDate: sub.endDate.toISOString(),
          newEndDate: newEndDate.toISOString(),
        },
      },
    });

    return this.formatSchoolSubscription(renewed);
  }

  /**
   * Check school entitlements (used by courses and other modules).
   */
  async getSchoolEntitlements(schoolId: string) {
    const sub = await this.prisma.schoolSubscription.findFirst({
      where: {
        schoolId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: new Date() },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    if (!sub) {
      return {
        hasActiveSubscription: false,
        maxStudents: 50,
        maxTeachers: 5,
        features: ['BASIC_ACCESS'],
      };
    }

    let parsedFeatures: string[] = [];
    if (sub.plan.features) {
      try {
        parsedFeatures = JSON.parse(sub.plan.features);
      } catch {
        parsedFeatures = [];
      }
    }

    return {
      hasActiveSubscription: true,
      subscriptionId: sub.id,
      planName: sub.plan.name,
      planCode: sub.plan.code,
      endDate: sub.endDate.toISOString(),
      maxStudents: sub.plan.maxStudents,
      maxTeachers: sub.plan.maxTeachers,
      features: parsedFeatures,
    };
  }

  private formatPlan(plan: any) {
    let features: string[] = [];
    if (plan.features) {
      try {
        features = JSON.parse(plan.features);
      } catch {
        features = [];
      }
    }

    return {
      id: plan.id,
      name: plan.name,
      code: plan.code,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      durationDays: plan.durationDays,
      maxStudents: plan.maxStudents,
      maxTeachers: plan.maxTeachers,
      features,
      isActive: plan.isActive,
      createdAt: plan.createdAt ? (typeof plan.createdAt === 'string' ? plan.createdAt : plan.createdAt.toISOString()) : new Date().toISOString(),
      updatedAt: plan.updatedAt ? (typeof plan.updatedAt === 'string' ? plan.updatedAt : plan.updatedAt.toISOString()) : new Date().toISOString(),
    };
  }

  private formatSchoolSubscription(sub: any) {
    return {
      id: sub.id,
      schoolId: sub.schoolId,
      schoolName: sub.school?.name || 'School',
      planId: sub.planId,
      planName: sub.plan?.name || 'Plan',
      planCode: sub.plan?.code || '',
      status: sub.status,
      startDate: sub.startDate ? (typeof sub.startDate === 'string' ? sub.startDate : sub.startDate.toISOString()) : new Date().toISOString(),
      endDate: sub.endDate ? (typeof sub.endDate === 'string' ? sub.endDate : sub.endDate.toISOString()) : new Date().toISOString(),
      autoRenew: sub.autoRenew,
      maxStudents: sub.plan?.maxStudents ?? 500,
      maxTeachers: sub.plan?.maxTeachers ?? 50,
      createdAt: sub.createdAt ? (typeof sub.createdAt === 'string' ? sub.createdAt : sub.createdAt.toISOString()) : new Date().toISOString(),
      updatedAt: sub.updatedAt ? (typeof sub.updatedAt === 'string' ? sub.updatedAt : sub.updatedAt.toISOString()) : new Date().toISOString(),
    };
  }
}
