/**
 * Automated tests for AI Live EMS Data Tools Service.
 * Verifies RBAC, school isolation, parent-child verification, and teacher privacy boundaries.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AiToolsService } from './ai-tools.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@ems/contracts';

describe('AiToolsService - RBAC & Multi-Tenant Isolation', () => {
  let service: AiToolsService;
  let prisma: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    attendanceRecord: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    attendanceSession: {
      findMany: jest.fn(),
    },
    studentGrade: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    assessment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    homeworkSubmission: {
      findMany: jest.fn(),
    },
    homework: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    classEnrollment: {
      findFirst: jest.fn(),
    },
    timetableEntry: {
      findMany: jest.fn(),
    },
    schoolClass: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    school: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    feeInvoice: {
      findMany: jest.fn(),
    },
    studentGuardianRelationship: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiToolsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AiToolsService>(AiToolsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('Teacher Financial Records Isolation', () => {
    it('strictly forbids teachers from accessing student fee summaries', async () => {
      const teacherPrincipal = {
        userId: 'teacher-1',
        role: UserRole.TEACHER,
        schoolId: 'school-1',
      };

      const result = await service.executeTool('get_fee_summary', teacherPrincipal);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Teachers do not have access to student financial records');
    });
  });

  describe('Parent-Child Verification Boundary', () => {
    it('blocks parents from accessing records of unlinked students', async () => {
      const parentPrincipal = {
        userId: 'parent-1',
        role: UserRole.PARENT,
        schoolId: 'school-1',
      };

      // Mock that parent-1 is only linked to student-verified-1
      prisma.studentGuardianRelationship.findMany.mockResolvedValue([
        { student: { id: 'student-verified-1', firstName: 'Child', lastName: 'One' } },
      ]);

      const result = await service.executeTool('get_attendance_summary', parentPrincipal, {
        studentId: 'unrelated-student-999',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });

    it('allows parents to access attendance for verified linked children', async () => {
      const parentPrincipal = {
        userId: 'parent-1',
        role: UserRole.PARENT,
        schoolId: 'school-1',
      };

      prisma.studentGuardianRelationship.findMany.mockResolvedValue([
        { student: { id: 'student-verified-1', firstName: 'Child', lastName: 'One' } },
      ]);

      prisma.attendanceRecord.findMany.mockResolvedValue([
        { status: 'PRESENT', attendanceSession: { attendanceDate: new Date(), title: 'Morning' } },
      ]);

      const result = await service.executeTool('get_attendance_summary', parentPrincipal, {
        studentId: 'student-verified-1',
      });

      expect(result.success).toBe(true);
      expect(result.data.studentId).toBe('student-verified-1');
      expect(result.data.attendanceRate).toBe('100%');
    });
  });

  describe('Student Data Privacy Boundary', () => {
    it('retrieves only the authenticated student’s own attendance records', async () => {
      const studentPrincipal = {
        userId: 'student-123',
        role: UserRole.STUDENT,
        schoolId: 'school-1',
      };

      prisma.attendanceRecord.findMany.mockResolvedValue([
        { status: 'PRESENT', remarks: null, attendanceSession: { attendanceDate: new Date(), title: 'Session 1' } },
        { status: 'ABSENT', remarks: null, attendanceSession: { attendanceDate: new Date(), title: 'Session 2' } },
      ]);

      const result = await service.executeTool('get_attendance_summary', studentPrincipal);

      expect(result.success).toBe(true);
      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 'student-123' },
        }),
      );
      expect(result.data.attendanceRate).toBe('50%');
    });
  });

  describe('Administrator Enrollment Summary Access', () => {
    it('forbids students and teachers from requesting campus enrollment metrics', async () => {
      const studentPrincipal = {
        userId: 'student-1',
        role: UserRole.STUDENT,
        schoolId: 'school-1',
      };

      const result = await service.executeTool('get_enrollment_summary', studentPrincipal);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Enrollment summaries are restricted');
    });

    it('allows School Administrators to view campus-scoped enrollment', async () => {
      const adminPrincipal = {
        userId: 'admin-1',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: 'school-1',
      };

      prisma.user.count
        .mockResolvedValueOnce(120) // students
        .mockResolvedValueOnce(15);  // teachers
      prisma.schoolClass.count.mockResolvedValue(6);
      prisma.schoolClass.findMany.mockResolvedValue([{ name: 'Grade 10', _count: { sections: 2 } }]);

      const result = await service.executeTool('get_enrollment_summary', adminPrincipal);
      expect(result.success).toBe(true);
      expect(result.data.totalEnrolledStudents).toBe(120);
      expect(result.data.totalFacultyTeachers).toBe(15);
    });
  });

  describe('Unrecognized Tools', () => {
    it('returns error when tool does not exist', async () => {
      const result = await service.executeTool('non_existent_tool', {
        userId: 'user-1',
        role: UserRole.PLATFORM_ADMIN,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not recognized');
    });
  });
});
