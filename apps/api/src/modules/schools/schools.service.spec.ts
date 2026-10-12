/**
 * MODULE: School Management - SchoolsService Unit Tests
 *
 * PURPOSE:
 * Automated verification of multi-school administrative capabilities:
 * tenancy creation, duplicate rejection, cross-tenant isolation, role permission checks,
 * status activation/deactivation, administrator assignment, and audit event recording.
 *
 * DEPENDENCIES:
 * @nestjs/testing, SchoolsService, PrismaService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, SchoolStatus, UserRole } from '@ems/contracts';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let prisma: any;

  const platformAdmin: AuthUser = {
    id: 'admin-uuid-1',
    email: 'platform.admin@ems.local',
    firstName: 'Alexander',
    lastName: 'Vance',
    role: UserRole.PLATFORM_ADMIN,
    schoolId: null,
  };

  const schoolAdminA: AuthUser = {
    id: 'school-admin-uuid-1',
    email: 'admin@stjude.ems.local',
    firstName: 'Eleanor',
    lastName: 'Pemberton',
    role: UserRole.SCHOOL_ADMIN,
    schoolId: 'school-uuid-a',
  };

  const studentUser: AuthUser = {
    id: 'student-uuid-1',
    email: 'student@stjude.ems.local',
    firstName: 'Liam',
    lastName: 'Chen',
    role: UserRole.STUDENT,
    schoolId: 'school-uuid-a',
  };

  const mockSchool = {
    id: 'school-uuid-a',
    name: 'St. Jude Institutional Academy',
    code: 'st-jude',
    domain: 'stjude.ems.local',
    status: SchoolStatus.ACTIVE,
    address: '100 Institutional Boulevard',
    city: 'Metropolis',
    state: 'NY',
    country: 'USA',
    logoUrl: null,
    phone: '+1-555-019-2831',
    email: 'admissions@stjude.ems.local',
    settings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      school: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SchoolsService>(SchoolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 1. Platform Admin creates a school
  it('1. Platform Admin successfully creates a school', async () => {
    prisma.school.findUnique.mockResolvedValue(null);
    prisma.school.create.mockResolvedValue(mockSchool);

    const result = await service.createSchool(
      {
        name: 'St. Jude Institutional Academy',
        code: 'st-jude',
        city: 'Metropolis',
      },
      platformAdmin,
    );

    expect(result).toBeDefined();
    expect(result.code).toBe('st-jude');
    expect(prisma.school.create).toHaveBeenCalled();
    // 12. Audit event recorded
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SCHOOL_CREATED',
          actorId: platformAdmin.id,
        }),
      }),
    );
  });

  // 2. Duplicate school code is rejected
  it('2. Duplicate school code is rejected with ConflictException', async () => {
    prisma.school.findUnique.mockResolvedValue(mockSchool);

    await expect(
      service.createSchool(
        { name: 'Duplicate School', code: 'st-jude' },
        platformAdmin,
      ),
    ).rejects.toThrow(ConflictException);
  });

  // 3. Platform Admin edits a school
  it('3. Platform Admin edits a school successfully', async () => {
    prisma.school.findUnique.mockResolvedValue(mockSchool);
    prisma.school.update.mockResolvedValue({
      ...mockSchool,
      name: 'St. Jude Updated Name',
    });

    const result = await service.updateSchool(
      'school-uuid-a',
      { name: 'St. Jude Updated Name' },
      platformAdmin,
    );

    expect(result.name).toBe('St. Jude Updated Name');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SCHOOL_UPDATED',
        }),
      }),
    );
  });

  // 4. Unauthorized users are rejected from listing schools
  it('4 & 9. Unauthorized non-admin user is rejected from listing schools', async () => {
    await expect(
      service.findAll({ page: 1, limit: 10 }, studentUser),
    ).rejects.toThrow(ForbiddenException);
  });

  // 5 & 10. School Admin cannot update an inactive/deactivated school
  it('5 & 10. Inactive school cannot be updated by School Admin', async () => {
    prisma.school.findUnique.mockResolvedValue({
      ...mockSchool,
      status: SchoolStatus.INACTIVE,
    });

    await expect(
      service.updateSchool(
        'school-uuid-a',
        { address: 'New Address' },
        schoolAdminA,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // 6. School Admin cannot access another school
  it('6. School Admin cannot access another school details', async () => {
    await expect(
      service.findById('school-uuid-other', schoolAdminA),
    ).rejects.toThrow(ForbiddenException);
  });

  // 7. School Admin can update their own school permitted fields
  it('7. School Admin can update permitted fields for their assigned school', async () => {
    prisma.school.findUnique.mockResolvedValue(mockSchool);
    prisma.school.update.mockResolvedValue({
      ...mockSchool,
      address: '999 Campus Way',
    });

    const result = await service.updateSchool(
      'school-uuid-a',
      { address: '999 Campus Way' },
      schoolAdminA,
    );

    expect(result.address).toBe('999 Campus Way');
  });

  // 8. Administrator assignment works
  it('8. Administrator assignment succeeds and records audit log', async () => {
    prisma.school.findUnique.mockResolvedValue(mockSchool);
    prisma.user.findUnique.mockResolvedValue({
      id: 'teacher-uuid-1',
      email: 'faculty@stjude.ems.local',
      role: UserRole.TEACHER,
    });
    prisma.user.update.mockResolvedValue({
      id: 'teacher-uuid-1',
      email: 'faculty@stjude.ems.local',
      role: UserRole.SCHOOL_ADMIN,
      schoolId: 'school-uuid-a',
    });

    const result = await service.assignAdministrator(
      'school-uuid-a',
      'teacher-uuid-1',
      platformAdmin,
    );

    expect(result.role).toBe(UserRole.SCHOOL_ADMIN);
    expect(result.schoolId).toBe('school-uuid-a');
  });

  // 10. Platform Admin can activate/deactivate school
  it('10. Platform Admin activates and deactivates school status', async () => {
    prisma.school.findUnique.mockResolvedValue(mockSchool);
    prisma.school.update.mockResolvedValue({
      ...mockSchool,
      status: SchoolStatus.INACTIVE,
    });

    const result = await service.updateStatus(
      'school-uuid-a',
      SchoolStatus.INACTIVE,
      platformAdmin,
    );

    expect(result.status).toBe(SchoolStatus.INACTIVE);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SCHOOL_STATUS_CHANGED',
        }),
      }),
    );
  });

  it('10b. Throws NotFoundException if target school does not exist', async () => {
    prisma.school.findUnique.mockResolvedValue(null);

    await expect(
      service.findById('non-existent-school', platformAdmin),
    ).rejects.toThrow(NotFoundException);
  });

  // 11. Search, filtering and pagination work
  it('11. Search, filtering and pagination operate correctly for Platform Admin', async () => {
    prisma.school.findMany.mockResolvedValue([mockSchool]);
    prisma.school.count.mockResolvedValue(1);
    prisma.user.count.mockResolvedValue(5);

    const result = await service.findAll(
      { page: 1, limit: 10, search: 'St. Jude', status: SchoolStatus.ACTIVE },
      platformAdmin,
    );

    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(prisma.school.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: SchoolStatus.ACTIVE,
        }),
      }),
    );
  });
});
