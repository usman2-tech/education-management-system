/**
 * MODULE: Teacher Management - TeachersService Unit Tests
 *
 * PURPOSE:
 * Automated verification of teacher management capabilities:
 * account creation, RBAC boundaries, cross-tenant isolation, duplicate employee code rejection,
 * teacher self-service restrictions, status transitions, school affiliation, and audit logging.
 *
 * DEPENDENCIES:
 * @nestjs/testing, TeachersService, PrismaService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, UserRole, TeacherEmploymentStatus, SchoolStatus } from '@ems/contracts';

describe('TeachersService', () => {
  let service: TeachersService;
  let prisma: any;

  const platformAdmin: AuthUser = {
    id: 'platform-admin-uuid',
    email: 'platform.admin@ems.local',
    firstName: 'Alexander',
    lastName: 'Vance',
    role: UserRole.PLATFORM_ADMIN,
    schoolId: null,
  };

  const schoolAdminA: AuthUser = {
    id: 'school-admin-uuid-a',
    email: 'admin@stjude.ems.local',
    firstName: 'Eleanor',
    lastName: 'Pemberton',
    role: UserRole.SCHOOL_ADMIN,
    schoolId: 'school-uuid-a',
  };

  const teacherA: AuthUser = {
    id: 'teacher-uuid-a',
    email: 'marcus@stjude.ems.local',
    firstName: 'Marcus',
    lastName: 'Holloway',
    role: UserRole.TEACHER,
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

  const mockSchoolA = {
    id: 'school-uuid-a',
    name: 'St. Jude Institutional Academy',
    code: 'st-jude',
    status: SchoolStatus.ACTIVE,
  };

  const mockSchoolB = {
    id: 'school-uuid-b',
    name: 'Northwood Prep',
    code: 'northwood',
    status: SchoolStatus.ACTIVE,
  };

  const mockTeacherRecord = {
    id: 'teacher-uuid-a',
    email: 'marcus@stjude.ems.local',
    firstName: 'Marcus',
    lastName: 'Holloway',
    role: UserRole.TEACHER,
    schoolId: 'school-uuid-a',
    isActive: true,
    phone: '+1-555-019-3388',
    avatarUrl: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    school: mockSchoolA,
    teacherProfile: {
      id: 'profile-uuid-1',
      userId: 'teacher-uuid-a',
      employeeCode: 'TCH-1001',
      qualification: 'M.Sc. Mathematics',
      specialization: 'Calculus',
      joiningDate: new Date('2026-01-01'),
      employmentStatus: TeacherEmploymentStatus.ACTIVE,
      phone: '+1-555-019-3388',
      address: '42 Academic Way',
      bio: 'Senior Faculty',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    memberships: [
      {
        id: 'mem-1',
        schoolId: 'school-uuid-a',
        role: UserRole.TEACHER,
        isActive: true,
        employeeCode: 'TCH-1001',
        employmentStatus: TeacherEmploymentStatus.ACTIVE,
        joinedAt: new Date('2026-01-01'),
        school: mockSchoolA,
      },
    ],
  };

  beforeEach(async () => {
    const mockPrisma = {
      school: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      teacherProfile: {
        findFirst: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      schoolMembership: {
        findFirst: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TeachersService>(TeachersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createTeacher', () => {
    it('1. Platform Admin can create a teacher in any active school', async () => {
      prisma.school.findUnique.mockResolvedValue(mockSchoolA);
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(mockTeacherRecord);
      prisma.schoolMembership.findFirst.mockResolvedValue(null);
      prisma.teacherProfile.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'teacher-uuid-a', email: 'new.teacher@ems.local' });
      prisma.teacherProfile.create.mockResolvedValue({ id: 'profile-uuid-1', employeeCode: 'TCH-2001' });
      prisma.schoolMembership.create.mockResolvedValue({ id: 'mem-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createTeacher(
        {
          email: 'new.teacher@ems.local',
          firstName: 'Sarah',
          lastName: 'Jenkins',
          schoolId: 'school-uuid-a',
          employeeCode: 'TCH-2001',
        },
        platformAdmin,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('teacher-uuid-a');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TEACHER_CREATED',
            actorEmail: platformAdmin.email,
          }),
        }),
      );
    });

    it('2. School Admin can create a teacher in their own school', async () => {
      prisma.school.findUnique.mockResolvedValue(mockSchoolA);
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(mockTeacherRecord);
      prisma.schoolMembership.findFirst.mockResolvedValue(null);
      prisma.teacherProfile.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'teacher-uuid-a', email: 'teacher@stjude.ems.local' });
      prisma.teacherProfile.create.mockResolvedValue({ id: 'profile-uuid-1' });
      prisma.schoolMembership.create.mockResolvedValue({ id: 'mem-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createTeacher(
        {
          email: 'teacher@stjude.ems.local',
          firstName: 'Sarah',
          lastName: 'Jenkins',
          employeeCode: 'TCH-1002',
        },
        schoolAdminA,
      );

      expect(result).toBeDefined();
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: 'school-uuid-a',
          }),
        }),
      );
    });

    it('3. School Admin cannot create a teacher in another school', async () => {
      await expect(
        service.createTeacher(
          {
            email: 'teacher@northwood.ems.local',
            firstName: 'Sarah',
            lastName: 'Jenkins',
            schoolId: mockSchoolB.id,
          },
          schoolAdminA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('4. Duplicate employee codes are rejected within the same school', async () => {
      prisma.school.findUnique.mockResolvedValue(mockSchoolA);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.schoolMembership.findFirst.mockResolvedValue({ id: 'existing-mem', employeeCode: 'TCH-1001' });

      await expect(
        service.createTeacher(
          {
            email: 'another@stjude.ems.local',
            firstName: 'Alex',
            lastName: 'Smith',
            schoolId: 'school-uuid-a',
            employeeCode: 'TCH-1001',
          },
          schoolAdminA,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getTeachers', () => {
    it('5. Teacher directory respects school boundaries for School Admin', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([mockTeacherRecord]);

      const result = await service.getTeachers({ page: 1, limit: 10 }, schoolAdminA);

      expect(result.items.length).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { schoolId: 'school-uuid-a' },
              { memberships: { some: { schoolId: 'school-uuid-a' } } },
            ],
          }),
        }),
      );
    });
  });

  describe('getTeacherById', () => {
    it('6. Teacher details enforce authorization (School Admin cannot view foreign teacher)', async () => {
      const foreignTeacher = {
        ...mockTeacherRecord,
        schoolId: 'school-uuid-b',
        memberships: [{ schoolId: 'school-uuid-b', role: UserRole.TEACHER }],
      };
      prisma.user.findUnique.mockResolvedValue(foreignTeacher);

      await expect(service.getTeacherById('teacher-uuid-b', schoolAdminA)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateTeacher', () => {
    it('7. Teacher updates persist correctly by School Admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockTeacherRecord);
      prisma.user.update.mockResolvedValue(mockTeacherRecord);
      prisma.teacherProfile.upsert.mockResolvedValue(mockTeacherRecord.teacherProfile);
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.updateTeacher(
        'teacher-uuid-a',
        { qualification: 'Ph.D. in Applied Mathematics' },
        schoolAdminA,
      );

      expect(result).toBeDefined();
      expect(prisma.teacherProfile.upsert).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TEACHER_UPDATED',
          }),
        }),
      );
    });

    it('8. Teacher cannot modify their own employee code', async () => {
      prisma.user.findUnique.mockResolvedValue(mockTeacherRecord);

      await expect(
        service.updateTeacher(
          'teacher-uuid-a',
          { employeeCode: 'HACKED-999' },
          teacherA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Role-based security', () => {
    it('9. Student or Parent cannot manage teachers', async () => {
      await expect(
        service.createTeacher(
          {
            email: 'unauthorized@ems.local',
            firstName: 'Test',
            lastName: 'Teacher',
          },
          studentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assignTeacherToSchool', () => {
    it('10. Teacher school assignment works', async () => {
      prisma.school.findUnique.mockResolvedValue(mockSchoolA);
      prisma.user.findUnique.mockResolvedValue(mockTeacherRecord);
      prisma.schoolMembership.findFirst.mockResolvedValue(null);
      prisma.schoolMembership.upsert.mockResolvedValue({ id: 'mem-new' });
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.assignTeacherToSchool(
        'teacher-uuid-a',
        { schoolId: 'school-uuid-a', employeeCode: 'TCH-1001' },
        schoolAdminA,
      );

      expect(result).toBeDefined();
      expect(prisma.schoolMembership.upsert).toHaveBeenCalled();
    });
  });

  describe('updateTeacherStatus', () => {
    it('11. Teacher deactivation updates active status and logs audit event', async () => {
      prisma.user.findUnique.mockResolvedValue(mockTeacherRecord);
      prisma.user.update.mockResolvedValue({ ...mockTeacherRecord, isActive: false });
      prisma.schoolMembership.updateMany.mockResolvedValue({ count: 1 });
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.updateTeacherStatus(
        'teacher-uuid-a',
        { isActive: false, employmentStatus: TeacherEmploymentStatus.SUSPENDED },
        schoolAdminA,
      );

      expect(result).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  describe('auditEvents', () => {
    it('12. Audit events are recorded during teacher status changes', async () => {
      prisma.user.findUnique.mockResolvedValue(mockTeacherRecord);
      prisma.user.update.mockResolvedValue(mockTeacherRecord);
      prisma.schoolMembership.updateMany.mockResolvedValue({ count: 1 });
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.updateTeacherStatus(
        'teacher-uuid-a',
        { employmentStatus: TeacherEmploymentStatus.ON_LEAVE },
        schoolAdminA,
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TEACHER_STATUS_UPDATED',
            actorEmail: schoolAdminA.email,
          }),
        }),
      );
    });
  });
});
