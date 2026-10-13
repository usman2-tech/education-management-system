/**
 * UNIT TESTS: CoursesService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { UserRole, EnrollmentStatus } from '@prisma/client';

describe('CoursesService', () => {
  let service: CoursesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      course: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      courseModule: { create: jest.fn(), findUnique: jest.fn() },
      courseLesson: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      courseEnrollment: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      lessonProgress: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      studentGuardianRelationship: { findFirst: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should create a course successfully', async () => {
    prisma.course.findFirst.mockResolvedValue(null);
    prisma.course.create.mockResolvedValue({
      id: 'crs-1',
      title: 'Advanced Robotics',
      code: 'ROB-301',
      schoolId: 'sch-1',
    });

    const result = await service.createCourse(
      { id: 'teacher-1', role: UserRole.TEACHER, schoolId: 'sch-1' },
      { title: 'Advanced Robotics', code: 'ROB-301' },
    );

    expect(result.id).toBe('crs-1');
    expect(prisma.course.create).toHaveBeenCalled();
  });

  it('should reject course creation with duplicate code in same school', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'existing-crs' });

    await expect(
      service.createCourse(
        { id: 'teacher-1', role: UserRole.TEACHER, schoolId: 'sch-1' },
        { title: 'Robotics', code: 'ROB-301' },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should allow student to enroll in published course', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'crs-1',
      published: true,
      schoolId: 'sch-1',
    });
    prisma.courseEnrollment.upsert.mockResolvedValue({
      id: 'enr-1',
      status: EnrollmentStatus.ACTIVE,
    });

    const res = await service.enrollCourse(
      { id: 'student-1', role: UserRole.STUDENT, schoolId: 'sch-1' },
      'crs-1',
    );

    expect(res.status).toBe(EnrollmentStatus.ACTIVE);
  });

  it('should reject enrollment in unpublished course', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'crs-1',
      published: false,
      schoolId: 'sch-1',
    });

    await expect(
      service.enrollCourse(
        { id: 'student-1', role: UserRole.STUDENT, schoolId: 'sch-1' },
        'crs-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject enrollment in course from another school', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: 'crs-1',
      published: true,
      schoolId: 'sch-2',
    });

    await expect(
      service.enrollCourse(
        { id: 'student-1', role: UserRole.STUDENT, schoolId: 'sch-1' },
        'crs-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should complete lesson and mark course complete when all lessons finished', async () => {
    prisma.courseLesson.findUnique.mockResolvedValue({
      id: 'les-1',
      module: { courseId: 'crs-1' },
    });
    prisma.courseEnrollment.findUnique.mockResolvedValue({
      id: 'enr-1',
      status: EnrollmentStatus.ACTIVE,
    });
    prisma.lessonProgress.upsert.mockResolvedValue({
      id: 'lp-1',
      isCompleted: true,
    });
    prisma.courseLesson.findMany.mockResolvedValue([{ id: 'les-1' }]);
    prisma.lessonProgress.count.mockResolvedValue(1); // 1 out of 1 completed
    prisma.courseEnrollment.update.mockResolvedValue({
      id: 'enr-1',
      status: EnrollmentStatus.COMPLETED,
    });

    const progress = await service.completeLesson(
      { id: 'student-1', role: UserRole.STUDENT, schoolId: 'sch-1' },
      'les-1',
    );

    expect(progress.isCompleted).toBe(true);
    expect(prisma.courseEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: EnrollmentStatus.COMPLETED }),
      }),
    );
  });

  it('should allow verified parent to view student course progress', async () => {
    prisma.studentGuardianRelationship.findFirst.mockResolvedValue({
      verificationStatus: 'VERIFIED',
    });
    prisma.courseEnrollment.findMany.mockResolvedValue([
      {
        id: 'enr-1',
        courseId: 'crs-1',
        enrolledAt: new Date(),
        status: EnrollmentStatus.ACTIVE,
        course: {
          title: 'Physics',
          code: 'PHY-101',
          modules: [
            {
              lessons: [{ id: 'les-1' }, { id: 'les-2' }],
            },
          ],
        },
      },
    ]);
    prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 'les-1' }]);

    const res = await service.getStudentCourses(
      { id: 'parent-1', role: UserRole.PARENT, schoolId: 'sch-1' },
      'student-1',
    );

    expect(res.length).toBe(1);
    expect(res[0].progressPercentage).toBe(50); // 1 out of 2 = 50%
  });
});
