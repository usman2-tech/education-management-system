/**
 * MODULE: Teacher Management - Teachers Service
 *
 * PURPOSE:
 * Implements business logic, tenant boundary enforcement, DTO transformations,
 * and audit tracking for teacher profiles, school assignments, and status lifecycles.
 *
 * DEPENDENCIES:
 * PrismaService, ConfigService, bcryptjs, @ems/contracts
 *
 * SECURITY:
 * Strict school isolation: School Admins can only view, create, and manage teachers
 * affiliated with their authorized schoolId. Platform Admins have multi-school oversight.
 * Teachers can only view/update their personal non-credential profile details.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import {
  AuthUser,
  UserRole,
  TeacherDto,
  TeacherProfileDto,
  TeacherSchoolMembershipDto,
  PaginatedResponse,
  TeacherEmploymentStatus,
} from '@ems/contracts';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { UpdateTeacherStatusDto } from './dto/update-teacher-status.dto';
import { AssignTeacherSchoolDto } from './dto/assign-teacher-school.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Onboards a new educator, creates their User account and TeacherProfile,
   * establishes school membership, and writes an audit log.
   */
  async createTeacher(dto: CreateTeacherDto, currentUser: AuthUser): Promise<TeacherDto> {
    // 1. Resolve and validate target school tenant
    let targetSchoolId: string;

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (!currentUser.schoolId) {
        throw new ForbiddenException('School Administrator is not bound to an institutional tenant.');
      }
      if (dto.schoolId && dto.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('School Administrators cannot onboard teachers to external institutions.');
      }
      targetSchoolId = currentUser.schoolId;
    } else if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      if (!dto.schoolId) {
        throw new BadRequestException('Target institutional schoolId is required when onboarding as Platform Admin.');
      }
      targetSchoolId = dto.schoolId;
    } else {
      throw new ForbiddenException('Only institutional and platform administrators can onboard teachers.');
    }

    // 2. Validate target school existence and operational status
    const school = await this.prisma.school.findUnique({
      where: { id: targetSchoolId },
    });
    if (!school) {
      throw new NotFoundException(`Institutional School with ID "${targetSchoolId}" does not exist.`);
    }
    if (school.status === 'INACTIVE' || school.status === 'SUSPENDED') {
      throw new BadRequestException(`Cannot onboard faculty to a ${school.status.toLowerCase()} institution.`);
    }

    // 3. Check duplicate user email
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException(`A user account with email "${normalizedEmail}" already exists.`);
    }

    // 4. Validate duplicate employee code within target school if specified
    if (dto.employeeCode && dto.employeeCode.trim()) {
      const trimmedCode = dto.employeeCode.trim();
      const codeInMembership = await this.prisma.schoolMembership.findFirst({
        where: {
          schoolId: targetSchoolId,
          employeeCode: trimmedCode,
        },
      });
      const codeInProfile = await this.prisma.teacherProfile.findFirst({
        where: {
          employeeCode: trimmedCode,
          user: { schoolId: targetSchoolId },
        },
      });

      if (codeInMembership || codeInProfile) {
        throw new ConflictException(
          `Employee code "${trimmedCode}" is already in use at ${school.name}.`,
        );
      }
    }

    // 5. Hash password (defaults to 'Password123!' if omitted)
    const rawPassword = dto.password || 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // 6. Execute atomic creation transaction
    const createdTeacher = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          role: UserRole.TEACHER,
          schoolId: targetSchoolId,
          phone: dto.phone?.trim() || null,
          isActive: true,
        },
      });

      const profile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          employeeCode: dto.employeeCode?.trim() || null,
          qualification: dto.qualification?.trim() || null,
          specialization: dto.specialization?.trim() || null,
          phone: dto.phone?.trim() || null,
          address: dto.address?.trim() || null,
          bio: dto.bio?.trim() || null,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
          employmentStatus: TeacherEmploymentStatus.ACTIVE,
        },
      });

      await tx.schoolMembership.create({
        data: {
          userId: user.id,
          schoolId: targetSchoolId,
          role: UserRole.TEACHER,
          employeeCode: dto.employeeCode?.trim() || null,
          employmentStatus: TeacherEmploymentStatus.ACTIVE,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'TEACHER_CREATED',
          entityType: 'Teacher',
          entityId: user.id,
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          schoolId: targetSchoolId,
          details: {
            email: user.email,
            employeeCode: profile.employeeCode,
            schoolName: school.name,
            qualification: profile.qualification,
          },
        },
      });

      return user;
    });

    this.logger.log(`Teacher created successfully: ${createdTeacher.email} (${createdTeacher.id}) in ${school.name}`);
    return this.getTeacherById(createdTeacher.id, currentUser);
  }

  /**
   * Retrieves a paginated directory of teachers with strict school isolation,
   * search capability, and status filtering.
   */
  async getTeachers(
    query: TeacherQueryDto,
    currentUser: AuthUser,
  ): Promise<PaginatedResponse<TeacherDto>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    // Role-based school tenancy boundary
    let targetSchoolId: string | undefined = undefined;

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (!currentUser.schoolId) {
        throw new ForbiddenException('School Administrator is not bound to a school tenant.');
      }
      targetSchoolId = currentUser.schoolId;
    } else if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      if (query.schoolId) {
        targetSchoolId = query.schoolId;
      }
    } else {
      throw new ForbiddenException('Insufficient permissions to list teacher directory.');
    }

    // Build Prisma where clause
    const where: any = {
      role: UserRole.TEACHER,
    };

    if (targetSchoolId) {
      where.OR = [
        { schoolId: targetSchoolId },
        { memberships: { some: { schoolId: targetSchoolId } } },
      ];
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const searchConditions = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { teacherProfile: { employeeCode: { contains: s, mode: 'insensitive' } } },
        { teacherProfile: { specialization: { contains: s, mode: 'insensitive' } } },
        { teacherProfile: { qualification: { contains: s, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    if (query.status && query.status.trim()) {
      const st = query.status.trim().toUpperCase();
      if (st === 'ACTIVE') {
        where.isActive = true;
      } else if (st === 'INACTIVE') {
        where.isActive = false;
      } else if (['ON_LEAVE', 'SUSPENDED', 'TERMINATED'].includes(st)) {
        where.teacherProfile = {
          employmentStatus: st as TeacherEmploymentStatus,
        };
      }
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          school: {
            select: { id: true, name: true, code: true },
          },
          teacherProfile: true,
          memberships: {
            include: {
              school: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);

    const items = users.map((u) => this.mapToTeacherDto(u));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves single teacher record with tenant boundary enforcement.
   */
  async getTeacherById(id: string, currentUser: AuthUser): Promise<TeacherDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        school: {
          select: { id: true, name: true, code: true },
        },
        teacherProfile: true,
        memberships: {
          include: {
            school: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!user || user.role !== UserRole.TEACHER) {
      throw new NotFoundException(`Teacher with ID "${id}" was not found.`);
    }

    // Role-based security validation
    this.assertTeacherAccess(user, currentUser);

    return this.mapToTeacherDto(user);
  }

  /**
   * Retrieves authenticated teacher's personal profile and school memberships.
   */
  async getCurrentTeacherProfile(currentUser: AuthUser): Promise<TeacherDto> {
    return this.getTeacherById(currentUser.id, currentUser);
  }

  /**
   * Updates teacher profile details (names, contact, credentials, qualifications).
   * Prevents role elevation or unauthorized cross-tenant modifications.
   */
  async updateTeacher(
    id: string,
    dto: UpdateTeacherDto,
    currentUser: AuthUser,
  ): Promise<TeacherDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        teacherProfile: true,
        memberships: true,
      },
    });

    if (!user || user.role !== UserRole.TEACHER) {
      throw new NotFoundException(`Teacher with ID "${id}" was not found.`);
    }

    // Validate access permission
    this.assertTeacherAccess(user, currentUser);

    // If teacher is updating themselves: disallow employee code change
    if (currentUser.role === UserRole.TEACHER && dto.employeeCode && dto.employeeCode !== user.teacherProfile?.employeeCode) {
      throw new ForbiddenException('Faculty members cannot alter their own institutional employee code.');
    }

    // Validate employee code duplicate if changed by admin
    if (dto.employeeCode && dto.employeeCode.trim() && user.schoolId) {
      const trimmedCode = dto.employeeCode.trim();
      const existingConflict = await this.prisma.schoolMembership.findFirst({
        where: {
          schoolId: user.schoolId,
          employeeCode: trimmedCode,
          NOT: { userId: user.id },
        },
      });

      if (existingConflict) {
        throw new ConflictException(`Employee code "${trimmedCode}" is already in use by another faculty member.`);
      }
    }

    // Execute atomic update
    await this.prisma.$transaction(async (tx) => {
      // 1. Update user fields
      const userUpdateData: any = {};
      if (dto.firstName) userUpdateData.firstName = dto.firstName.trim();
      if (dto.lastName) userUpdateData.lastName = dto.lastName.trim();
      if (dto.phone !== undefined) userUpdateData.phone = dto.phone?.trim() || null;

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: userUpdateData,
        });
      }

      // 2. Update or create TeacherProfile
      const profileUpdateData: any = {};
      if (dto.employeeCode !== undefined) profileUpdateData.employeeCode = dto.employeeCode?.trim() || null;
      if (dto.qualification !== undefined) profileUpdateData.qualification = dto.qualification?.trim() || null;
      if (dto.specialization !== undefined) profileUpdateData.specialization = dto.specialization?.trim() || null;
      if (dto.phone !== undefined) profileUpdateData.phone = dto.phone?.trim() || null;
      if (dto.address !== undefined) profileUpdateData.address = dto.address?.trim() || null;
      if (dto.bio !== undefined) profileUpdateData.bio = dto.bio?.trim() || null;
      if (dto.joiningDate) profileUpdateData.joiningDate = new Date(dto.joiningDate);

      await tx.teacherProfile.upsert({
        where: { userId: user.id },
        update: profileUpdateData,
        create: {
          userId: user.id,
          employeeCode: dto.employeeCode?.trim() || null,
          qualification: dto.qualification?.trim() || null,
          specialization: dto.specialization?.trim() || null,
          phone: dto.phone?.trim() || null,
          address: dto.address?.trim() || null,
          bio: dto.bio?.trim() || null,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
          employmentStatus: TeacherEmploymentStatus.ACTIVE,
        },
      });

      // Update employee code in primary school membership if applicable
      if (dto.employeeCode !== undefined && user.schoolId) {
        await tx.schoolMembership.updateMany({
          where: { userId: user.id, schoolId: user.schoolId },
          data: { employeeCode: dto.employeeCode?.trim() || null },
        });
      }

      // 3. Record Audit Log
      await tx.auditLog.create({
        data: {
          action: 'TEACHER_UPDATED',
          entityType: 'Teacher',
          entityId: user.id,
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          schoolId: user.schoolId,
          details: {
            updatedFields: { ...userUpdateData, ...profileUpdateData },
          },
        },
      });
    });

    return this.getTeacherById(id, currentUser);
  }

  /**
   * Toggles teacher active state or institutional employment status.
   */
  async updateTeacherStatus(
    id: string,
    dto: UpdateTeacherStatusDto,
    currentUser: AuthUser,
  ): Promise<TeacherDto> {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN && currentUser.role !== UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException('Only administrators can modify teacher status.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        teacherProfile: true,
        memberships: true,
      },
    });

    if (!user || user.role !== UserRole.TEACHER) {
      throw new NotFoundException(`Teacher with ID "${id}" was not found.`);
    }

    this.assertTeacherAccess(user, currentUser);

    const targetSchoolId = dto.schoolId || user.schoolId || currentUser.schoolId;

    await this.prisma.$transaction(async (tx) => {
      // 1. Update user global active status if provided
      if (dto.isActive !== undefined) {
        await tx.user.update({
          where: { id: user.id },
          data: { isActive: dto.isActive },
        });
      }

      // 2. Update TeacherProfile employment status if provided
      if (dto.employmentStatus) {
        await tx.teacherProfile.upsert({
          where: { userId: user.id },
          update: { employmentStatus: dto.employmentStatus },
          create: {
            userId: user.id,
            employmentStatus: dto.employmentStatus,
          },
        });
      }

      // 3. Update specific SchoolMembership if targeted or active
      if (targetSchoolId) {
        await tx.schoolMembership.updateMany({
          where: { userId: user.id, schoolId: targetSchoolId },
          data: {
            isActive: dto.isActive !== undefined ? dto.isActive : undefined,
            employmentStatus: dto.employmentStatus || undefined,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          action: 'TEACHER_STATUS_UPDATED',
          entityType: 'Teacher',
          entityId: user.id,
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          schoolId: targetSchoolId,
          details: {
            isActive: dto.isActive,
            employmentStatus: dto.employmentStatus,
            targetSchoolId,
          },
        },
      });
    });

    return this.getTeacherById(id, currentUser);
  }

  /**
   * Associates an existing teacher with another institutional school tenant.
   */
  async assignTeacherToSchool(
    id: string,
    dto: AssignTeacherSchoolDto,
    currentUser: AuthUser,
  ): Promise<TeacherDto> {
    // Determine authorized target school
    let targetSchoolId: string;
    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (!currentUser.schoolId || currentUser.schoolId !== dto.schoolId) {
        throw new ForbiddenException('School Administrators cannot assign faculty to foreign institutions.');
      }
      targetSchoolId = currentUser.schoolId;
    } else if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      targetSchoolId = dto.schoolId;
    } else {
      throw new ForbiddenException('Only administrators can assign faculty to schools.');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: targetSchoolId },
    });
    if (!school) {
      throw new NotFoundException(`School with ID "${targetSchoolId}" does not exist.`);
    }
    if (school.status === 'INACTIVE' || school.status === 'SUSPENDED') {
      throw new BadRequestException(`Cannot assign faculty to ${school.status.toLowerCase()} institution.`);
    }

    const teacher = await this.prisma.user.findUnique({
      where: { id },
      include: { memberships: true },
    });
    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new NotFoundException(`Teacher with ID "${id}" does not exist.`);
    }

    // Check duplicate employee code within target school
    if (dto.employeeCode && dto.employeeCode.trim()) {
      const codeInMembership = await this.prisma.schoolMembership.findFirst({
        where: {
          schoolId: targetSchoolId,
          employeeCode: dto.employeeCode.trim(),
          NOT: { userId: teacher.id },
        },
      });
      if (codeInMembership) {
        throw new ConflictException(
          `Employee code "${dto.employeeCode.trim()}" is already assigned at ${school.name}.`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.schoolMembership.upsert({
        where: {
          userId_schoolId: {
            userId: teacher.id,
            schoolId: targetSchoolId,
          },
        },
        update: {
          isActive: true,
          employeeCode: dto.employeeCode?.trim() || undefined,
          employmentStatus: TeacherEmploymentStatus.ACTIVE,
        },
        create: {
          userId: teacher.id,
          schoolId: targetSchoolId,
          role: UserRole.TEACHER,
          employeeCode: dto.employeeCode?.trim() || null,
          employmentStatus: TeacherEmploymentStatus.ACTIVE,
          isActive: true,
        },
      });

      // If user had no primary schoolId, assign this one
      if (!teacher.schoolId) {
        await tx.user.update({
          where: { id: teacher.id },
          data: { schoolId: targetSchoolId },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'TEACHER_ASSIGNED_TO_SCHOOL',
          entityType: 'Teacher',
          entityId: teacher.id,
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          schoolId: targetSchoolId,
          details: {
            schoolName: school.name,
            employeeCode: dto.employeeCode,
          },
        },
      });
    });

    return this.getTeacherById(id, currentUser);
  }

  /**
   * Asserts whether the given actor is authorized to access or modify the specified teacher.
   */
  private assertTeacherAccess(teacherUser: any, currentUser: AuthUser): void {
    if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      return; // Global access
    }

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (!currentUser.schoolId) {
        throw new ForbiddenException('School Administrator has no institutional binding.');
      }
      const isPrimarySchool = teacherUser.schoolId === currentUser.schoolId;
      const isMember = teacherUser.memberships?.some(
        (m: any) => m.schoolId === currentUser.schoolId,
      );

      if (!isPrimarySchool && !isMember) {
        throw new ForbiddenException(
          'Access forbidden. This faculty member does not belong to your authorized school.',
        );
      }
      return;
    }

    if (currentUser.role === UserRole.TEACHER) {
      if (teacherUser.id === currentUser.id) {
        return; // Teachers may access their own profile
      }
      throw new ForbiddenException('Educators are only permitted to inspect their own faculty profile.');
    }

    throw new ForbiddenException('Insufficient role permissions for faculty operations.');
  }

  /**
   * Maps internal database User + TeacherProfile + SchoolMemberships to clean public TeacherDto
   */
  private mapToTeacherDto(user: any): TeacherDto {
    const profile: TeacherProfileDto | null = user.teacherProfile
      ? {
          id: user.teacherProfile.id,
          userId: user.teacherProfile.userId,
          employeeCode: user.teacherProfile.employeeCode,
          qualification: user.teacherProfile.qualification,
          specialization: user.teacherProfile.specialization,
          joiningDate: user.teacherProfile.joiningDate.toISOString(),
          employmentStatus: user.teacherProfile.employmentStatus as TeacherEmploymentStatus,
          phone: user.teacherProfile.phone,
          address: user.teacherProfile.address,
          bio: user.teacherProfile.bio,
          createdAt: user.teacherProfile.createdAt.toISOString(),
          updatedAt: user.teacherProfile.updatedAt.toISOString(),
        }
      : null;

    const memberships: TeacherSchoolMembershipDto[] = (user.memberships || []).map((m: any) => ({
      id: m.id,
      schoolId: m.schoolId,
      schoolName: m.school?.name || 'Institutional School',
      schoolCode: m.school?.code || 'school',
      role: m.role,
      isActive: m.isActive,
      employeeCode: m.employeeCode,
      employmentStatus: m.employmentStatus,
      joinedAt: m.joinedAt ? m.joinedAt.toISOString() : m.createdAt.toISOString(),
    }));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      profile,
      primarySchool: user.school
        ? {
            id: user.school.id,
            name: user.school.name,
            code: user.school.code,
          }
        : null,
      memberships,
    };
  }
}
