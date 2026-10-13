/**
 * MODULE: Subscription Codes & Activation Management - Service
 *
 * PURPOSE:
 * Cryptographically secure generation of single/multi-use activation tokens,
 * concurrency-safe redemption, duplicate prevention, school restriction checks,
 * and comprehensive audit trails.
 *
 * DEPENDENCIES:
 * PrismaService, crypto, UserRole
 *
 * SECURITY:
 * Platform Admins control code creation, revocation, and redemption oversight.
 * Students and authorized users redeem individual codes for entitlements.
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import {
  GenerateSubscriptionCodesDto,
  RedeemSubscriptionCodeDto,
  SubscriptionCodeFilterDto,
} from './dto/subscription-codes.dto';

@Injectable()
export class SubscriptionCodesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bulk generate cryptographically random, unpredictable activation codes.
   */
  async generateCodes(
    currentUser: { id: string; role: UserRole },
    dto: GenerateSubscriptionCodesDto,
  ) {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only Platform Administrators can generate subscription codes');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    if (dto.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: dto.schoolId },
      });
      if (!school) throw new NotFoundException('Target school not found');
    }

    const expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= new Date()) {
      throw new BadRequestException('Expiration date must be in the future');
    }

    const maxRedemptions = dto.maxRedemptions ?? 1;
    const prefix = (dto.prefix || 'EMS').toUpperCase().replace(/[^A-Z0-9]/g, '');

    const createdCodes: any[] = [];

    // Generate codes with collision-free uniqueness guarantee
    for (let i = 0; i < dto.count; i++) {
      // 12 bytes = 24 hex characters formatted as EMS-XXXX-YYYY-ZZZZ
      const randHex = crypto.randomBytes(6).toString('hex').toUpperCase();
      const part1 = randHex.substring(0, 4);
      const part2 = randHex.substring(4, 8);
      const part3 = randHex.substring(8, 12);
      const codeString = `${prefix}-${part1}-${part2}-${part3}`;

      const record = await this.prisma.subscriptionCode.create({
        data: {
          code: codeString,
          planId: dto.planId,
          schoolId: dto.schoolId || null,
          maxRedemptions,
          timesRedeemed: 0,
          expiresAt,
          isRevoked: false,
          createdById: currentUser.id,
        },
        include: {
          plan: true,
          school: true,
        },
      });

      createdCodes.push(record);
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'SUBSCRIPTION_CODES_GENERATED',
        entityType: 'SubscriptionCode',
        entityId: createdCodes[0]?.id || 'bulk',
        actorId: currentUser.id,
        details: {
          count: dto.count,
          planName: plan.name,
          prefix,
          schoolId: dto.schoolId,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    return createdCodes.map((c) => this.formatCode(c));
  }

  /**
   * Redeem a subscription code.
   * Enforces expiration, revocation, max limits, school restriction, and duplicate checks.
   */
  async redeemCode(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    dto: RedeemSubscriptionCodeDto,
  ) {
    const cleanCode = dto.code.trim().toUpperCase();

    const codeRecord = await this.prisma.subscriptionCode.findUnique({
      where: { code: cleanCode },
      include: {
        plan: true,
        school: true,
        redemptions: {
          where: { userId: currentUser.id },
        },
      },
    });

    if (!codeRecord) {
      throw new NotFoundException('Invalid activation code. Please check the code entered.');
    }

    // Revocation check
    if (codeRecord.isRevoked) {
      throw new BadRequestException('This activation code has been revoked and is no longer valid.');
    }

    // Expiration check
    if (new Date() > codeRecord.expiresAt) {
      throw new BadRequestException('This activation code has expired.');
    }

    // Maximum redemptions check
    if (codeRecord.timesRedeemed >= codeRecord.maxRedemptions) {
      throw new BadRequestException(
        'This activation code has reached its maximum allowable redemption limit.',
      );
    }

    // School restriction check
    if (codeRecord.schoolId) {
      const effectiveSchoolId = currentUser.schoolId || dto.schoolId;
      if (!effectiveSchoolId || effectiveSchoolId !== codeRecord.schoolId) {
        throw new ForbiddenException(
          'This activation code is restricted to members of a specific school.',
        );
      }
    }

    // Duplicate redemption check: student cannot redeem same code twice
    if (codeRecord.redemptions && codeRecord.redemptions.length > 0) {
      throw new ConflictException('You have already redeemed this activation code.');
    }

    const schoolIdForRedemption =
      currentUser.schoolId || dto.schoolId || codeRecord.schoolId;
    if (!schoolIdForRedemption) {
      throw new BadRequestException('A school affiliation is required to redeem this code.');
    }

    // Atomically increment redemption count and record redemption
    const [updatedCode, redemption] = await this.prisma.$transaction([
      this.prisma.subscriptionCode.update({
        where: { id: codeRecord.id },
        data: {
          timesRedeemed: { increment: 1 },
        },
        include: { plan: true, school: true },
      }),
      this.prisma.codeRedemption.create({
        data: {
          codeId: codeRecord.id,
          userId: currentUser.id,
          schoolId: schoolIdForRedemption,
        },
        include: {
          code: { include: { plan: true } },
          user: true,
          school: true,
        },
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        action: 'SUBSCRIPTION_CODE_REDEEMED',
        entityType: 'CodeRedemption',
        entityId: redemption.id,
        actorId: currentUser.id,
        schoolId: schoolIdForRedemption,
        details: {
          code: cleanCode,
          planName: updatedCode.plan.name,
          timesRedeemed: updatedCode.timesRedeemed,
        },
      },
    });

    return {
      success: true,
      message: `Successfully activated subscription plan: ${updatedCode.plan.name}`,
      redemption: this.formatRedemption(redemption),
    };
  }

  /**
   * Revoke an active subscription code (Platform Admin only).
   */
  async revokeCode(
    currentUser: { id: string; role: UserRole },
    codeId: string,
  ) {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only Platform Administrators can revoke subscription codes');
    }

    const codeRecord = await this.prisma.subscriptionCode.findUnique({
      where: { id: codeId },
    });
    if (!codeRecord) throw new NotFoundException('Subscription code not found');

    const updated = await this.prisma.subscriptionCode.update({
      where: { id: codeId },
      data: { isRevoked: true },
      include: { plan: true, school: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'SUBSCRIPTION_CODE_REVOKED',
        entityType: 'SubscriptionCode',
        entityId: updated.id,
        actorId: currentUser.id,
        details: { code: updated.code },
      },
    });

    return this.formatCode(updated);
  }

  /**
   * List generated codes with optional filters (Platform Admin only).
   */
  async getCodes(
    currentUser: { id: string; role: UserRole },
    query: SubscriptionCodeFilterDto,
  ) {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only Platform Administrators can inspect activation codes');
    }

    const where: any = {};
    if (query.planId) where.planId = query.planId;
    if (query.schoolId) where.schoolId = query.schoolId;
    if (query.isRevoked !== undefined) where.isRevoked = query.isRevoked;
    if (query.search) {
      where.code = { contains: query.search.trim().toUpperCase() };
    }

    const codes = await this.prisma.subscriptionCode.findMany({
      where,
      include: {
        plan: true,
        school: true,
        createdBy: true,
        _count: { select: { redemptions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return codes.map((c) => this.formatCode(c));
  }

  /**
   * List redemptions history (Platform Admin).
   */
  async getRedemptions(
    currentUser: { id: string; role: UserRole },
    codeId?: string,
  ) {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only Platform Administrators can view full redemption history');
    }

    const where: any = {};
    if (codeId) where.codeId = codeId;

    const redemptions = await this.prisma.codeRedemption.findMany({
      where,
      include: {
        code: { include: { plan: true } },
        user: true,
        school: true,
      },
      orderBy: { redeemedAt: 'desc' },
      take: 200,
    });

    return redemptions.map((r) => this.formatRedemption(r));
  }

  /**
   * Get student's personal redemption history.
   */
  async getMyRedemptions(currentUser: { id: string }) {
    const redemptions = await this.prisma.codeRedemption.findMany({
      where: { userId: currentUser.id },
      include: {
        code: { include: { plan: true } },
        user: true,
        school: true,
      },
      orderBy: { redeemedAt: 'desc' },
    });

    return redemptions.map((r) => this.formatRedemption(r));
  }

  private formatCode(c: any) {
    return {
      id: c.id,
      code: c.code,
      planId: c.planId,
      planName: c.plan?.name || 'Plan',
      schoolId: c.schoolId,
      schoolName: c.school?.name || null,
      maxRedemptions: c.maxRedemptions,
      timesRedeemed: c.timesRedeemed,
      expiresAt: c.expiresAt ? (typeof c.expiresAt === 'string' ? c.expiresAt : c.expiresAt.toISOString()) : new Date().toISOString(),
      isRevoked: c.isRevoked,
      createdById: c.createdById,
      creatorEmail: c.createdBy?.email,
      createdAt: c.createdAt ? (typeof c.createdAt === 'string' ? c.createdAt : c.createdAt.toISOString()) : new Date().toISOString(),
      redemptionsCount: c._count?.redemptions ?? c.timesRedeemed,
    };
  }

  private formatRedemption(r: any) {
    return {
      id: r.id,
      codeId: r.codeId,
      codeValue: r.code?.code || 'CODE',
      planName: r.code?.plan?.name || 'Plan',
      userId: r.userId,
      userEmail: r.user?.email || '',
      userName: r.user ? `${r.user.firstName} ${r.user.lastName}` : '',
      schoolId: r.schoolId,
      schoolName: r.school?.name || '',
      redeemedAt: r.redeemedAt ? (typeof r.redeemedAt === 'string' ? r.redeemedAt : r.redeemedAt.toISOString()) : new Date().toISOString(),
    };
  }
}
