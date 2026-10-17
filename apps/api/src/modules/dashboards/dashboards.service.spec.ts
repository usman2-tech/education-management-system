import { Test, TestingModule } from '@nestjs/testing';
import { DashboardsService } from './dashboards.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { UserRole, AuthUser } from '@ems/contracts';

describe('DashboardsService', () => {
  let service: DashboardsService;
  let prisma: any;

  const mockPrismaService = {
    school: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    schoolSubscription: {
      count: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
    attendanceSession: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    attendanceRecord: {
      findMany: jest.fn(),
    },
    classSection: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    assessment: {
      count: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    studentGrade: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    subject: {
      findMany: jest.fn(),
    },
    homework: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    homeworkSubmission: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    exam: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    timetableEntry: {
      findMany: jest.fn(),
    },
    directMessage: {
      findMany: jest.fn(),
    },
    classEnrollment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    courseEnrollment: {
      findMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
    studentGuardianRelationship: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardsService>(DashboardsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getPlatformAdminDashboard', () => {
    it('should throw ForbiddenException if user is not PLATFORM_ADMIN', async () => {
      const teacherUser: AuthUser = {
        id: 'user-1',
        email: 'teacher@school.edu',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.TEACHER,
        schoolId: 'school-1',
      };

      await expect(service.getPlatformAdminDashboard(teacherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should compute platform dashboard statistics for PLATFORM_ADMIN', async () => {
      const adminUser: AuthUser = {
        id: 'admin-1',
        email: 'superadmin@ems.edu',
        firstName: 'System',
        lastName: 'Admin',
        role: UserRole.PLATFORM_ADMIN,
        schoolId: null,
      };

      prisma.school.count.mockResolvedValue(5);
      prisma.user.count.mockResolvedValue(10);
      prisma.schoolSubscription.count.mockResolvedValue(4);
      prisma.school.findMany.mockResolvedValue([
        {
          id: 'school-1',
          name: 'St. Jude',
          code: 'SJA',
          status: 'ACTIVE',
          users: [{ role: 'STUDENT' }, { role: 'TEACHER' }],
        },
      ]);
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.attendanceSession.findMany.mockResolvedValue([]);

      const result = await service.getPlatformAdminDashboard(adminUser);

      expect(result.totalSchools).toBe(5);
      expect(result.schoolComparisons).toHaveLength(1);
      expect(result.schoolComparisons[0].studentsCount).toBe(1);
      expect(result.schoolComparisons[0].teachersCount).toBe(1);
    });
  });

  describe('getSchoolAdminDashboard', () => {
    it('should throw ForbiddenException if school context is missing', async () => {
      const invalidUser: AuthUser = {
        id: 'admin-2',
        email: 'admin@ems.edu',
        firstName: 'Missing',
        lastName: 'School',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: null,
      };

      await expect(service.getSchoolAdminDashboard(invalidUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return aggregated school metrics for SCHOOL_ADMIN', async () => {
      const schoolAdmin: AuthUser = {
        id: 'admin-3',
        email: 'principal@school.edu',
        firstName: 'Principal',
        lastName: 'Skinner',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: 'school-1',
      };

      prisma.user.count.mockResolvedValue(25);
      prisma.classSection.count.mockResolvedValue(4);
      prisma.attendanceSession.findMany.mockResolvedValue([]);
      prisma.studentGrade.findMany.mockResolvedValue([]);
      prisma.subject.findMany.mockResolvedValue([]);
      prisma.homework.count.mockResolvedValue(10);
      prisma.homeworkSubmission.count.mockResolvedValue(8);
      prisma.exam.findMany.mockResolvedValue([]);
      prisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getSchoolAdminDashboard(schoolAdmin);

      expect(result.totalStudents).toBe(25);
      expect(result.activeClasses).toBe(4);
      expect(result.homeworkCompletionRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTeacherDashboard', () => {
    it('should throw ForbiddenException if user is not TEACHER', async () => {
      const studentUser: AuthUser = {
        id: 'student-1',
        email: 'student@school.edu',
        firstName: 'Bobby',
        lastName: 'Tables',
        role: UserRole.STUDENT,
        schoolId: 'school-1',
      };

      await expect(service.getTeacherDashboard(studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return teacher assigned classes, timetable and pending items', async () => {
      const teacherUser: AuthUser = {
        id: 'teacher-1',
        email: 'teacher@school.edu',
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.TEACHER,
        schoolId: 'school-1',
      };

      prisma.classSection.findMany.mockResolvedValue([
        {
          id: 'cs-1',
          name: 'Section A',
          schoolClass: { name: 'Grade 9' },
          enrollments: [{ id: 'en-1' }],
          teacherSubjectAssignments: [{ subject: { name: 'Mathematics' } }],
        },
      ]);
      prisma.timetableEntry.findMany.mockResolvedValue([]);
      prisma.attendanceSession.count.mockResolvedValue(1);
      prisma.homeworkSubmission.count.mockResolvedValue(3);
      prisma.studentGrade.count.mockResolvedValue(2);
      prisma.exam.findMany.mockResolvedValue([]);
      prisma.directMessage.findMany.mockResolvedValue([]);

      const result = await service.getTeacherDashboard(teacherUser);

      expect(result.assignedClassesCount).toBe(1);
      expect(result.pendingHomeworkReviewsCount).toBe(3);
      expect(result.pendingGradingCount).toBe(2);
    });
  });

  describe('getStudentDashboard', () => {
    it('should throw ForbiddenException if user is not STUDENT', async () => {
      const teacherUser: AuthUser = {
        id: 'teacher-1',
        email: 'teacher@school.edu',
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.TEACHER,
        schoolId: 'school-1',
      };

      await expect(service.getStudentDashboard(teacherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should compute attendance rate and academic GPA for student', async () => {
      const studentUser: AuthUser = {
        id: 'student-1',
        email: 'student@school.edu',
        firstName: 'Bart',
        lastName: 'Simpson',
        role: UserRole.STUDENT,
        schoolId: 'school-1',
      };

      prisma.attendanceRecord.findMany.mockResolvedValue([
        { status: 'PRESENT' },
        { status: 'PRESENT' },
        { status: 'ABSENT' },
      ]);
      prisma.studentGrade.findMany.mockResolvedValue([
        {
          id: 'g-1',
          marksObtained: 90,
          assessment: { title: 'Midterm', maximumMarks: 100, subject: { name: 'Math' } },
        },
      ]);
      prisma.classEnrollment.findFirst.mockResolvedValue(null);
      prisma.homeworkSubmission.findMany.mockResolvedValue([]);
      prisma.courseEnrollment.findMany.mockResolvedValue([]);
      prisma.notification.findMany.mockResolvedValue([]);

      const result = await service.getStudentDashboard(studentUser);

      expect(result.attendancePercentage).toBe(67);
      expect(result.overallPercentage).toBe(90);
      expect(result.letterGrade).toBe('A');
    });
  });

  describe('getParentDashboard', () => {
    it('should throw ForbiddenException if user is not PARENT', async () => {
      const studentUser: AuthUser = {
        id: 'student-1',
        email: 'student@school.edu',
        firstName: 'Lisa',
        lastName: 'Simpson',
        role: UserRole.STUDENT,
        schoolId: 'school-1',
      };

      await expect(service.getParentDashboard(studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return empty list if parent has no verified linked children', async () => {
      const parentUser: AuthUser = {
        id: 'parent-1',
        email: 'parent@home.edu',
        firstName: 'Marge',
        lastName: 'Simpson',
        role: UserRole.PARENT,
        schoolId: 'school-1',
      };

      prisma.studentGuardianRelationship.findMany.mockResolvedValue([]);

      const result = await service.getParentDashboard(parentUser);

      expect(result.children).toEqual([]);
      expect(result.selectedChildId).toBe('');
    });
  });
});
