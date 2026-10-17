/**
 * MODULE: Parent & Guardian Management - Parents Service
 *
 * PURPOSE:
 * Implements guardian accounts, parent profiles, multi-student relationships,
 * verification workflows, child profile aggregation, and audit logs.
 *
 * DEPENDENCIES:
 * PrismaService, bcryptjs, @ems/contracts
 *
 * SECURITY:
 * School isolation strictly enforced. School Admins cannot manage guardians for other schools.
 * Parents can only access students with active, VERIFIED relationships.
 * Revoked relationships immediately terminate all access.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import {
  AuthUser,
  UserRole,
  ParentGuardianDto,
  ParentGuardianProfileDto,
  LinkedStudentDto,
  ParentDashboardSummaryDto,
  PaginatedResponse,
  GuardianRelationshipType,
  RelationshipVerificationStatus,
} from '@ems/contracts';
import {
  CreateParentDto,
  UpdateParentDto,
  LinkStudentDto,
  VerifyRelationshipDto,
  ParentQueryDto,
} from './dto/parent.dto';

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new Parent user account and associated ParentGuardianProfile.
   */
  async createParent(dto: CreateParentDto, currentUser: AuthUser): Promise<ParentGuardianDto> {
    let targetSchoolId: string | null = null;

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (!currentUser.schoolId) {
        throw new ForbiddenException('School Administrator is not bound to a school tenant.');
      }
      targetSchoolId = currentUser.schoolId;
    } else if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      targetSchoolId = dto.schoolId || null;
    } else {
      throw new ForbiddenException('Insufficient permissions to onboard parent accounts.');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException(`An account with email "${normalizedEmail}" already exists.`);
    }

    const rawPassword = dto.password || 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const createdParent = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          role: UserRole.PARENT,
          schoolId: targetSchoolId,
          phone: dto.phone?.trim() || null,
          isActive: true,
        },
      });

      await tx.parentGuardianProfile.create({
        data: {
          userId: user.id,
          occupation: dto.occupation?.trim() || null,
          employer: dto.employer?.trim() || null,
          relationshipToFamily: dto.relationshipToFamily?.trim() || 'Parent',
          phoneAlt: dto.phoneAlt?.trim() || null,
          address: dto.address?.trim() || null,
        },
      });

      if (targetSchoolId) {
        await tx.schoolMembership.create({
          data: {
            userId: user.id,
            schoolId: targetSchoolId,
            role: UserRole.PARENT,
            isActive: true,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'PARENT_CREATED',
          entityType: 'ParentGuardian',
          entityId: user.id,
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          schoolId: targetSchoolId,
          details: { email: user.email, name: `${user.firstName} ${user.lastName}` },
        },
      });

      return user;
    });

    return this.getParentById(createdParent.id, currentUser);
  }

  /**
   * Retrieves a paginated directory of parents with search and school scoping.
   */
  async getParents(
    query: ParentQueryDto,
    currentUser: AuthUser,
  ): Promise<PaginatedResponse<ParentGuardianDto>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

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
      throw new ForbiddenException('Insufficient permissions to list parents directory.');
    }

    const where: any = { role: UserRole.PARENT };

    if (targetSchoolId) {
      where.OR = [
        { schoolId: targetSchoolId },
        { memberships: { some: { schoolId: targetSchoolId } } },
        {
          guardianRelationships: {
            some: {
              student: { schoolId: targetSchoolId },
            },
          },
        },
      ];
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const searchConditions = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { parentProfile: { occupation: { contains: s, mode: 'insensitive' } } },
        { parentProfile: { employer: { contains: s, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
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
          school: { select: { id: true, name: true, code: true } },
          parentProfile: true,
          guardianRelationships: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatarUrl: true,
                  schoolId: true,
                  school: { select: { id: true, name: true } },
                  studentProfile: true,
                  classEnrollments: {
                    where: { status: 'ACTIVE' },
                    include: {
                      section: {
                        include: { schoolClass: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const items = users.map((u) => this.mapToParentDto(u));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves single parent record with authorization checks and linked student details.
   */
  async getParentById(id: string, currentUser: AuthUser): Promise<ParentGuardianDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true, code: true } },
        parentProfile: true,
        guardianRelationships: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                schoolId: true,
                school: { select: { id: true, name: true } },
                studentProfile: true,
                classEnrollments: {
                  where: { status: 'ACTIVE' },
                  include: {
                    section: {
                      include: { schoolClass: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.role !== UserRole.PARENT) {
      throw new NotFoundException(`Parent account with ID "${id}" was not found.`);
    }

    this.assertParentAccess(user, currentUser);

    return this.mapToParentDto(user, currentUser);
  }

  /**
   * Retrieves the authenticated parent's self-service profile and only VERIFIED children.
   */
  async getCurrentParentProfile(currentUser: AuthUser): Promise<ParentGuardianDto> {
    return this.getParentById(currentUser.id, currentUser);
  }

  /**
   * Returns list of linked students for a parent/guardian.
   */
  async getLinkedStudents(guardianId: string, currentUser: AuthUser): Promise<LinkedStudentDto[]> {
    const parent = await this.getParentById(guardianId, currentUser);
    return parent.linkedStudents;
  }

  /**
   * Aggregates parent dashboard statistics and linked children.
   */
  async getParentDashboard(currentUser: AuthUser): Promise<ParentDashboardSummaryDto> {
    if (currentUser.role !== UserRole.PARENT) {
      throw new ForbiddenException('Only parents can access the parent dashboard.');
    }

    const parentDto = await this.getParentById(currentUser.id, currentUser);
    // Filter to only verified students
    const verifiedStudents = parentDto.linkedStudents.filter(
      (s) => s.verificationStatus === RelationshipVerificationStatus.VERIFIED,
    );

    return {
      parent: parentDto,
      students: verifiedStudents,
      activeAlertsCount: 0,
    };
  }

  /**
   * Updates parent personal profile information.
   */
  async updateParent(
    id: string,
    dto: UpdateParentDto,
    currentUser: AuthUser,
  ): Promise<ParentGuardianDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { guardianRelationships: { include: { student: true } } },
    });

    if (!user || user.role !== UserRole.PARENT) {
      throw new NotFoundException(`Parent account with ID "${id}" was not found.`);
    }

    this.assertParentAccess(user, currentUser);

    await this.prisma.$transaction(async (tx) => {
      const userUpdate: any = {};
      if (dto.firstName) userUpdate.firstName = dto.firstName.trim();
      if (dto.lastName) userUpdate.lastName = dto.lastName.trim();
      if (dto.phone !== undefined) userUpdate.phone = dto.phone?.trim() || null;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: userUpdate,
        });
      }

      const profileUpdate: any = {};
      if (dto.occupation !== undefined) profileUpdate.occupation = dto.occupation?.trim() || null;
      if (dto.employer !== undefined) profileUpdate.employer = dto.employer?.trim() || null;
      if (dto.relationshipToFamily !== undefined)
        profileUpdate.relationshipToFamily = dto.relationshipToFamily?.trim() || null;
      if (dto.phoneAlt !== undefined) profileUpdate.phoneAlt = dto.phoneAlt?.trim() || null;
      if (dto.address !== undefined) profileUpdate.address = dto.address?.trim() || null;

      await tx.parentGuardianProfile.upsert({
        where: { userId: user.id },
        update: profileUpdate,
        create: {
          userId: user.id,
          ...profileUpdate,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'PARENT_UPDATED',
          entityType: 'ParentGuardian',
          entityId: user.id,
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          schoolId: user.schoolId,
          details: { updatedFields: { ...userUpdate, ...profileUpdate } },
        },
      });
    });

    return this.getParentById(id, currentUser);
  }

  /**
   * Links a parent/guardian to an enrolled student.
   * Enforces school boundary: School Admin can only link students within their school.
   */
  async linkStudent(
    guardianId: string,
    dto: LinkStudentDto,
    currentUser: AuthUser,
  ): Promise<ParentGuardianDto> {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN && currentUser.role !== UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException('Only administrators can establish guardian-student linkages.');
    }

    const guardian = await this.prisma.user.findUnique({
      where: { id: guardianId },
    });
    if (!guardian || guardian.role !== UserRole.PARENT) {
      throw new NotFoundException(`Guardian with ID "${guardianId}" does not exist.`);
    }

    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException(`Student with ID "${dto.studentId}" does not exist.`);
    }

    // School boundary check
    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (!currentUser.schoolId || student.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('School Administrators can only link students enrolled in their school.');
      }
    }

    // Check existing relationship
    const existingRel = await this.prisma.studentGuardianRelationship.findUnique({
      where: {
        guardianId_studentId: {
          guardianId,
          studentId: dto.studentId,
        },
      },
    });

    if (existingRel) {
      if (existingRel.verificationStatus !== RelationshipVerificationStatus.REVOKED) {
        throw new ConflictException('An active relationship already exists between this guardian and student.');
      }
      // Reactivate revoked relationship
      await this.prisma.studentGuardianRelationship.update({
        where: { id: existingRel.id },
        data: {
          relationshipType: dto.relationshipType,
          verificationStatus: RelationshipVerificationStatus.VERIFIED,
          isPrimaryContact: dto.isPrimaryContact ?? false,
          isEmergencyContact: dto.isEmergencyContact ?? true,
          notes: dto.notes?.trim() || null,
        },
      });
    } else {
      await this.prisma.studentGuardianRelationship.create({
        data: {
          guardianId,
          studentId: dto.studentId,
          relationshipType: dto.relationshipType,
          verificationStatus: RelationshipVerificationStatus.VERIFIED,
          isPrimaryContact: dto.isPrimaryContact ?? false,
          isEmergencyContact: dto.isEmergencyContact ?? true,
          notes: dto.notes?.trim() || null,
        },
      });
    }

    // Also link guardian to student's school membership if not already present
    if (student.schoolId) {
      await this.prisma.schoolMembership.upsert({
        where: {
          userId_schoolId: {
            userId: guardian.id,
            schoolId: student.schoolId,
          },
        },
        update: { isActive: true },
        create: {
          userId: guardian.id,
          schoolId: student.schoolId,
          role: UserRole.PARENT,
          isActive: true,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'STUDENT_LINKED',
        entityType: 'StudentGuardianRelationship',
        entityId: `${guardianId}:${dto.studentId}`,
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        schoolId: student.schoolId,
        details: {
          guardianEmail: guardian.email,
          studentName: `${student.firstName} ${student.lastName}`,
          relationshipType: dto.relationshipType,
        },
      },
    });

    return this.getParentById(guardianId, currentUser);
  }

  /**
   * Verifies or revokes a guardian-student relationship.
   */
  async verifyRelationship(
    guardianId: string,
    studentId: string,
    dto: VerifyRelationshipDto,
    currentUser: AuthUser,
  ): Promise<ParentGuardianDto> {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN && currentUser.role !== UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException('Only administrators can verify or revoke guardian relationships.');
    }

    const relationship = await this.prisma.studentGuardianRelationship.findUnique({
      where: {
        guardianId_studentId: { guardianId, studentId },
      },
      include: { student: true },
    });

    if (!relationship) {
      throw new NotFoundException('Guardian-student relationship not found.');
    }

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (relationship.student.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('School Administrators cannot modify relationships for external students.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.studentGuardianRelationship.update({
        where: { id: relationship.id },
        data: {
          verificationStatus: dto.verificationStatus,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : relationship.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          action:
            dto.verificationStatus === RelationshipVerificationStatus.REVOKED
              ? 'RELATIONSHIP_REVOKED'
              : 'RELATIONSHIP_VERIFIED',
          entityType: 'StudentGuardianRelationship',
          entityId: relationship.id,
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          schoolId: relationship.student.schoolId,
          details: {
            guardianId,
            studentId,
            status: dto.verificationStatus,
          },
        },
      });
    });

    return this.getParentById(guardianId, currentUser);
  }

  /**
   * Security guard asserting access permissions for parent records.
   */
  private assertParentAccess(parentUser: any, currentUser: AuthUser): void {
    if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.PARENT) {
      if (parentUser.id === currentUser.id) {
        return;
      }
      throw new ForbiddenException('Parents are only authorized to access their own family record.');
    }

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (!currentUser.schoolId) {
        throw new ForbiddenException('School Administrator is not bound to a school.');
      }
      const isPrimarySchool = parentUser.schoolId === currentUser.schoolId;
      const hasStudentInSchool = parentUser.guardianRelationships?.some(
        (r: any) => r.student?.schoolId === currentUser.schoolId,
      );

      if (!isPrimarySchool && !hasStudentInSchool) {
        throw new ForbiddenException('Access denied. This guardian is not associated with your school.');
      }
      return;
    }

    throw new ForbiddenException('Insufficient permissions for parent records.');
  }

  /**
   * Maps internal user model to ParentGuardianDto with student relationships.
   */
  private mapToParentDto(user: any, currentUser?: AuthUser): ParentGuardianDto {
    const rawRelationships = user.guardianRelationships || [];
    const relationships = currentUser?.role === UserRole.PARENT
      ? rawRelationships.filter(
          (rel: any) => rel.verificationStatus === RelationshipVerificationStatus.VERIFIED,
        )
      : rawRelationships;

    const linkedStudents: LinkedStudentDto[] = relationships.map((rel: any) => {
      const student = rel.student;
      const activeEnrollment = student.classEnrollments?.[0];
      const section = activeEnrollment?.section;

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        avatarUrl: student.avatarUrl,
        admissionNumber: student.studentProfile?.admissionNumber || null,
        gradeLevel: student.studentProfile?.gradeLevel || null,
        schoolId: student.schoolId,
        schoolName: student.school?.name || null,
        relationshipId: rel.id,
        relationshipType: rel.relationshipType as GuardianRelationshipType,
        verificationStatus: rel.verificationStatus as RelationshipVerificationStatus,
        isPrimaryContact: rel.isPrimaryContact,
        isEmergencyContact: rel.isEmergencyContact,
        notes: rel.notes,
        currentSection: section
          ? {
              id: section.id,
              name: section.name,
              className: section.schoolClass?.name || 'Class',
              roomNumber: section.roomNumber,
            }
          : null,
      };
    });

    const profile: ParentGuardianProfileDto | null = user.parentProfile
      ? {
          id: user.parentProfile.id,
          userId: user.parentProfile.userId,
          occupation: user.parentProfile.occupation,
          employer: user.parentProfile.employer,
          relationshipToFamily: user.parentProfile.relationshipToFamily,
          phoneAlt: user.parentProfile.phoneAlt,
          address: user.parentProfile.address,
          createdAt: user.parentProfile.createdAt.toISOString(),
          updatedAt: user.parentProfile.updatedAt.toISOString(),
        }
      : null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt ? (user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt)) : new Date().toISOString(),
      updatedAt: user.updatedAt ? (user.updatedAt instanceof Date ? user.updatedAt.toISOString() : String(user.updatedAt)) : new Date().toISOString(),
      schoolId: user.schoolId,
      primarySchool: user.school
        ? {
            id: user.school.id,
            name: user.school.name,
            code: user.school.code,
          }
        : null,
      profile,
      linkedStudents,
    };
  }
}
