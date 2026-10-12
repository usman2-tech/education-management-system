/**
 * MODULE: School Management - Core Schools Service
 *
 * PURPOSE:
 * Implements administrative business logic for institutional tenancy:
 * multi-school registration, search and pagination, isolation enforcement,
 * status transitions (Active/Inactive), administrator assignments, and audit logging.
 *
 * DEPENDENCIES:
 * PrismaService, @ems/contracts
 *
 * SECURITY:
 * Strict role-scoping: Platform Admin possesses universal management authority;
 * School Admins are strictly scoped to their assigned institution and prohibited
 * from modifying core status, codes, or assigning platform credentials.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolQueryDto } from './dto/school-query.dto';
import {
  AuthUser,
  PaginatedResponse,
  SchoolDto,
  SchoolStatus,
  UserRole,
} from '@ems/contracts';

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers a new institutional school tenant (Platform Admin only)
   */
  async createSchool(dto: CreateSchoolDto, actor: AuthUser): Promise<SchoolDto> {
    const normalizedCode = dto.code.trim().toLowerCase();

    // Verify code uniqueness
    const existing = await this.prisma.school.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new ConflictException(
        `An institutional school with code '${normalizedCode}' already exists.`,
      );
    }

    const school = await this.prisma.school.create({
      data: {
        name: dto.name.trim(),
        code: normalizedCode,
        domain: dto.domain?.trim() || null,
        address: dto.address?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        country: dto.country?.trim() || 'USA',
        logoUrl: dto.logoUrl?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        status: SchoolStatus.ACTIVE,
      },
    });

    // Record institutional audit event
    await this.recordAudit({
      action: 'SCHOOL_CREATED',
      entityType: 'School',
      entityId: school.id,
      actorId: actor.id,
      actorEmail: actor.email,
      schoolId: school.id,
      details: { name: school.name, code: school.code },
    });

    this.logger.log(`School created: ${school.name} (${school.code}) by ${actor.email}`);

    return this.mapToDto(school);
  }

  /**
   * Retrieves paginated list of schools with search and status filtering
   */
  async findAll(
    query: SchoolQueryDto,
    actor: AuthUser,
  ): Promise<PaginatedResponse<SchoolDto>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based scoping
    if (actor.role === UserRole.PLATFORM_ADMIN) {
      // Platform Admin can filter by status or search across all schools
      if (query.status) {
        where.status = query.status;
      }

      if (query.search?.trim()) {
        const searchKeyword = query.search.trim();
        where.OR = [
          { name: { contains: searchKeyword, mode: 'insensitive' } },
          { code: { contains: searchKeyword, mode: 'insensitive' } },
          { city: { contains: searchKeyword, mode: 'insensitive' } },
        ];
      }
    } else if (actor.role === UserRole.SCHOOL_ADMIN) {
      // School Admin is strictly locked to their assigned institution
      if (!actor.schoolId) {
        return { items: [], total: 0, page, limit, totalPages: 0 };
      }
      where.id = actor.schoolId;
    } else {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view institutional management listings.',
      );
    }

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    const items = await Promise.all(
      schools.map(async (school) => {
        // Fetch role counts per school
        const [adminsCount, teachersCount, studentsCount] = await Promise.all([
          this.prisma.user.count({
            where: { schoolId: school.id, role: UserRole.SCHOOL_ADMIN },
          }),
          this.prisma.user.count({
            where: { schoolId: school.id, role: UserRole.TEACHER },
          }),
          this.prisma.user.count({
            where: { schoolId: school.id, role: UserRole.STUDENT },
          }),
        ]);

        return {
          ...this.mapToDto(school),
          administratorsCount: adminsCount,
          teachersCount,
          studentsCount,
        };
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves single institutional school by ID with role authorization check
   */
  async findById(id: string, actor: AuthUser): Promise<SchoolDto> {
    // School isolation check
    if (actor.role !== UserRole.PLATFORM_ADMIN && actor.schoolId !== id) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to access details for another institutional tenant.',
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      throw new NotFoundException(`Institutional school with ID '${id}' not found.`);
    }

    const [adminsCount, teachersCount, studentsCount] = await Promise.all([
      this.prisma.user.count({
        where: { schoolId: school.id, role: UserRole.SCHOOL_ADMIN },
      }),
      this.prisma.user.count({
        where: { schoolId: school.id, role: UserRole.TEACHER },
      }),
      this.prisma.user.count({
        where: { schoolId: school.id, role: UserRole.STUDENT },
      }),
    ]);

    return {
      ...this.mapToDto(school),
      administratorsCount: adminsCount,
      teachersCount,
      studentsCount,
    };
  }

  /**
   * Updates an institutional school's attributes
   */
  async updateSchool(
    id: string,
    dto: UpdateSchoolDto,
    actor: AuthUser,
  ): Promise<SchoolDto> {
    // Security check
    if (actor.role !== UserRole.PLATFORM_ADMIN && actor.schoolId !== id) {
      throw new ForbiddenException(
        'Access denied: You are only permitted to update your assigned institution.',
      );
    }

    const existing = await this.prisma.school.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Institutional school with ID '${id}' not found.`);
    }

    // Check if school is inactive and caller is not Platform Admin
    if (existing.status !== SchoolStatus.ACTIVE && actor.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        'This institutional school is currently deactivated or suspended. Management modifications are restricted.',
      );
    }

    const dataToUpdate: any = {
      name: dto.name !== undefined ? dto.name.trim() : existing.name,
      domain: dto.domain !== undefined ? dto.domain?.trim() || null : existing.domain,
      address: dto.address !== undefined ? dto.address?.trim() || null : existing.address,
      city: dto.city !== undefined ? dto.city?.trim() || null : existing.city,
      state: dto.state !== undefined ? dto.state?.trim() || null : existing.state,
      country: dto.country !== undefined ? dto.country?.trim() || 'USA' : existing.country,
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl?.trim() || null : existing.logoUrl,
      phone: dto.phone !== undefined ? dto.phone?.trim() || null : existing.phone,
      email: dto.email !== undefined ? dto.email?.trim() || null : existing.email,
    };

    const updated = await this.prisma.school.update({
      where: { id },
      data: dataToUpdate,
    });

    await this.recordAudit({
      action: 'SCHOOL_UPDATED',
      entityType: 'School',
      entityId: updated.id,
      actorId: actor.id,
      actorEmail: actor.email,
      schoolId: updated.id,
      details: { updatedFields: Object.keys(dto) },
    });

    this.logger.log(`School updated: ${updated.name} (${updated.id}) by ${actor.email}`);

    return this.mapToDto(updated);
  }

  /**
   * Activates or deactivates an institutional school tenant (Platform Admin only)
   */
  async updateStatus(
    id: string,
    newStatus: SchoolStatus,
    actor: AuthUser,
  ): Promise<SchoolDto> {
    const school = await this.prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      throw new NotFoundException(`Institutional school with ID '${id}' not found.`);
    }

    const updated = await this.prisma.school.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.recordAudit({
      action: 'SCHOOL_STATUS_CHANGED',
      entityType: 'School',
      entityId: updated.id,
      actorId: actor.id,
      actorEmail: actor.email,
      schoolId: updated.id,
      details: { previousStatus: school.status, updatedStatus: newStatus },
    });

    this.logger.log(
      `School status updated: ${updated.name} -> ${newStatus} by ${actor.email}`,
    );

    return this.mapToDto(updated);
  }

  /**
   * Assigns an existing user as School Administrator (Platform Admin only)
   */
  async assignAdministrator(
    schoolId: string,
    userId: string,
    actor: AuthUser,
  ) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(`Institutional school with ID '${schoolId}' not found.`);
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID '${userId}' not found.`);
    }

    // Prohibit elevating to Platform Admin through school admin assignment
    if (targetUser.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        'Platform Administrators cannot be assigned as institutional school administrators.',
      );
    }

    // Execute atomic assignment transaction
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          schoolId,
          role: UserRole.SCHOOL_ADMIN,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ADMIN_ASSIGNED',
          entityType: 'School',
          entityId: schoolId,
          actorId: actor.id,
          actorEmail: actor.email,
          schoolId,
          details: {
            assignedUserId: user.id,
            assignedUserEmail: user.email,
            previousRole: targetUser.role,
          },
        },
      });

      return user;
    });

    this.logger.log(
      `Assigned ${updatedUser.email} as School Admin for ${school.name} (${schoolId})`,
    );

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role as unknown as UserRole,
      schoolId: updatedUser.schoolId,
      assignedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves administrators assigned to an institutional school
   */
  async getAdministrators(schoolId: string, actor: AuthUser) {
    if (actor.role !== UserRole.PLATFORM_ADMIN && actor.schoolId !== schoolId) {
      throw new ForbiddenException(
        'Access denied: You cannot view administrators for another institution.',
      );
    }

    const admins = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: UserRole.SCHOOL_ADMIN,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return admins.map((a) => ({
      id: a.id,
      email: a.email,
      firstName: a.firstName,
      lastName: a.lastName,
      role: a.role as unknown as UserRole,
      isActive: a.isActive,
      assignedAt: a.createdAt.toISOString(),
    }));
  }

  /**
   * Helper: Persists audit events in the database
   */
  private async recordAudit(data: {
    action: string;
    entityType: string;
    entityId: string;
    actorId?: string;
    actorEmail?: string;
    schoolId?: string;
    details?: any;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          actorId: data.actorId || null,
          actorEmail: data.actorEmail || null,
          schoolId: data.schoolId || null,
          details: data.details || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record audit event: ${err.message}`);
    }
  }

  /**
   * Helper: Maps Prisma School entity to standardized SchoolDto
   */
  private mapToDto(school: any): SchoolDto {
    return {
      id: school.id,
      name: school.name,
      code: school.code,
      domain: school.domain,
      status: school.status as SchoolStatus,
      address: school.address,
      city: school.city,
      state: school.state,
      country: school.country,
      logoUrl: school.logoUrl,
      phone: school.phone,
      email: school.email,
      settings: school.settings,
      createdAt: school.createdAt.toISOString(),
      updatedAt: school.updatedAt.toISOString(),
    };
  }
}
