/**
 * MODULE: Parent & Guardian Management - ParentsService Unit Tests
 *
 * PURPOSE:
 * Automated verification of parent & guardian capabilities:
 * - Parent account creation
 * - Student linking
 * - Relationship verification & revocation
 * - Verified child visibility
 * - Access denial for unrelated child
 * - Immediate access revocation
 * - Multi-school isolation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUser,
  UserRole,
  GuardianRelationshipType,
  RelationshipVerificationStatus,
} from '@ems/contracts';

describe('ParentsService', () => {
  let service: ParentsService;
  let prisma: any;

  const schoolAdminA: AuthUser = {
    id: 'school-admin-uuid-a',
    email: 'admin@stjude.ems.local',
    firstName: 'Eleanor',
    lastName: 'Pemberton',
    role: UserRole.SCHOOL_ADMIN,
    schoolId: 'school-uuid-a',
  };

  const schoolAdminB: AuthUser = {
    id: 'school-admin-uuid-b',
    email: 'admin@apex.ems.local',
    firstName: 'Marcus',
    lastName: 'Brody',
    role: UserRole.SCHOOL_ADMIN,
    schoolId: 'school-uuid-b',
  };

  const parentUser: AuthUser = {
    id: 'parent-uuid-1',
    email: 'sarah.chen@parents.local',
    firstName: 'Sarah',
    lastName: 'Chen',
    role: UserRole.PARENT,
    schoolId: 'school-uuid-a',
  };

  const studentA = {
    id: 'student-uuid-a',
    email: 'liam.chen@students.local',
    firstName: 'Liam',
    lastName: 'Chen',
    role: UserRole.STUDENT,
    schoolId: 'school-uuid-a',
    studentProfile: { admissionNumber: 'STJ-2026-001', gradeLevel: 'Grade 10' },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      parentGuardianProfile: {
        create: jest.fn(),
        update: jest.fn(),
      },
      studentGuardianRelationship: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      schoolMembership: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ParentsService>(ParentsService);
  });

  describe('Scenario 1: Create parent account', () => {
    it('allows School Admin to create a parent account for their school', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-parent-id',
        email: 'parent.new@test.local',
        firstName: 'Robert',
        lastName: 'Taylor',
        role: UserRole.PARENT,
        schoolId: 'school-uuid-a',
        phone: '+15551234567',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.parentGuardianProfile.create.mockResolvedValue({
        id: 'prof-id',
        userId: 'new-parent-id',
        occupation: 'Engineer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // getParentById mock
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'new-parent-id',
        email: 'parent.new@test.local',
        firstName: 'Robert',
        lastName: 'Taylor',
        role: UserRole.PARENT,
        schoolId: 'school-uuid-a',
        isActive: true,
        phone: '+15551234567',
        createdAt: new Date(),
        updatedAt: new Date(),
        school: { id: 'school-uuid-a', name: 'St. Jude Academy', code: 'STJUDE' },
        parentProfile: { id: 'prof-id', occupation: 'Engineer', createdAt: new Date(), updatedAt: new Date() },
        guardianRelationships: [],
      });

      const res = await service.createParent(
        {
          email: 'parent.new@test.local',
          firstName: 'Robert',
          lastName: 'Taylor',
          phone: '+15551234567',
          occupation: 'Engineer',
        },
        schoolAdminA,
      );

      expect(res.id).toBe('new-parent-id');
      expect(res.email).toBe('parent.new@test.local');
    });

    it('rejects duplicate email during parent creation', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.createParent(
          { email: 'existing@test.local', firstName: 'John', lastName: 'Doe' },
          schoolAdminA,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Scenario 2: Link parent to student', () => {
    it('links guardian to student within authorized school', async () => {
      prisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'parent-uuid-1') {
          return Promise.resolve({
            id: 'parent-uuid-1',
            role: UserRole.PARENT,
            schoolId: 'school-uuid-a',
            guardianRelationships: [],
          });
        }
        if (where.id === studentA.id) {
          return Promise.resolve(studentA);
        }
        return Promise.resolve(null);
      });

      prisma.studentGuardianRelationship.findUnique.mockResolvedValue(null);
      prisma.studentGuardianRelationship.create.mockResolvedValue({
        id: 'rel-uuid-1',
        guardianId: 'parent-uuid-1',
        studentId: studentA.id,
        relationshipType: GuardianRelationshipType.MOTHER,
        verificationStatus: RelationshipVerificationStatus.VERIFIED,
      });

      const res = await service.linkStudent(
        'parent-uuid-1',
        {
          studentId: studentA.id,
          relationshipType: GuardianRelationshipType.MOTHER,
          isPrimaryContact: true,
          isEmergencyContact: true,
        },
        schoolAdminA,
      );

      expect(res).toBeDefined();
      expect(prisma.studentGuardianRelationship.create).toHaveBeenCalled();
    });

    it('rejects linking when relationship already exists', async () => {
      prisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'parent-uuid-1') {
          return Promise.resolve({ id: 'parent-uuid-1', role: UserRole.PARENT, schoolId: 'school-uuid-a' });
        }
        if (where.id === studentA.id) {
          return Promise.resolve(studentA);
        }
        return Promise.resolve(null);
      });
      prisma.studentGuardianRelationship.findUnique.mockResolvedValue({ id: 'existing-rel' });

      await expect(
        service.linkStudent(
          'parent-uuid-1',
          { studentId: studentA.id, relationshipType: GuardianRelationshipType.MOTHER },
          schoolAdminA,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Scenario 3: Verify relationship', () => {
    it('allows school admin to verify a relationship', async () => {
      prisma.studentGuardianRelationship.findUnique.mockResolvedValue({
        id: 'rel-uuid-1',
        guardianId: 'parent-uuid-1',
        studentId: studentA.id,
        verificationStatus: RelationshipVerificationStatus.PENDING_VERIFICATION,
        student: studentA,
      });

      prisma.studentGuardianRelationship.update.mockResolvedValue({
        id: 'rel-uuid-1',
        guardianId: 'parent-uuid-1',
        studentId: studentA.id,
        verificationStatus: RelationshipVerificationStatus.VERIFIED,
      });

      prisma.user.findUnique.mockResolvedValue({
        id: 'parent-uuid-1',
        role: UserRole.PARENT,
        schoolId: 'school-uuid-a',
        createdAt: new Date(),
        updatedAt: new Date(),
        guardianRelationships: [],
      });

      const res = await service.verifyRelationship(
        'parent-uuid-1',
        studentA.id,
        { verificationStatus: RelationshipVerificationStatus.VERIFIED },
        schoolAdminA,
      );

      expect(res).toBeDefined();
      expect(prisma.studentGuardianRelationship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verificationStatus: RelationshipVerificationStatus.VERIFIED }),
        }),
      );
    });
  });

  describe('Scenario 4 & 5: Parent child visibility & Isolation', () => {
    it('returns verified linked children to the parent', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: parentUser.id,
        email: parentUser.email,
        firstName: parentUser.firstName,
        lastName: parentUser.lastName,
        role: UserRole.PARENT,
        schoolId: 'school-uuid-a',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentProfile: { id: 'prof-id', occupation: 'Architect', createdAt: new Date(), updatedAt: new Date() },
        guardianRelationships: [
          {
            id: 'rel-1',
            relationshipType: GuardianRelationshipType.MOTHER,
            verificationStatus: RelationshipVerificationStatus.VERIFIED,
            isPrimaryContact: true,
            isEmergencyContact: true,
            student: {
              ...studentA,
              classEnrollments: [],
            },
          },
        ],
      });

      const res = await service.getLinkedStudents(parentUser.id, parentUser);
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(studentA.id);
      expect(res[0].verificationStatus).toBe(RelationshipVerificationStatus.VERIFIED);
    });

    it('denies parent access to another parent profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'other-parent-id',
        role: UserRole.PARENT,
      });

      await expect(service.getParentById('other-parent-id', parentUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Scenario 6: Revoked relationship blocks access', () => {
    it('filters out revoked relationships from parent view', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: parentUser.id,
        role: UserRole.PARENT,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        guardianRelationships: [
          {
            id: 'rel-revoked',
            relationshipType: GuardianRelationshipType.MOTHER,
            verificationStatus: RelationshipVerificationStatus.REVOKED,
            student: studentA,
          },
        ],
      });

      const res = await service.getLinkedStudents(parentUser.id, parentUser);
      expect(res.length).toBe(0);
    });
  });

  describe('Scenario 7: School isolation is enforced', () => {
    it('School Admin B cannot link or administer students from School A', async () => {
      prisma.user.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'parent-uuid-1') {
          return Promise.resolve({ id: 'parent-uuid-1', role: UserRole.PARENT, schoolId: 'school-uuid-b' });
        }
        if (where.id === studentA.id) {
          // student belongs to School A
          return Promise.resolve(studentA);
        }
        return Promise.resolve(null);
      });

      await expect(
        service.linkStudent(
          'parent-uuid-1',
          { studentId: studentA.id, relationshipType: GuardianRelationshipType.MOTHER },
          schoolAdminB,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
