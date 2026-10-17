/**
 * UNIT TESTS: HomeworkService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HomeworkService } from './homework.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole, HomeworkStatus, HomeworkSubmissionStatus } from '@prisma/client';

describe('HomeworkService', () => {
  let service: HomeworkService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      classSection: { findUnique: jest.fn() },
      teacherSubjectAssignment: { findFirst: jest.fn() },
      homework: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      homeworkSubmission: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      classEnrollment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      studentGuardianRelationship: { findFirst: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeworkService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<HomeworkService>(HomeworkService);
  });

  it('should allow assigned teacher to create homework', async () => {
    prisma.classSection.findUnique.mockResolvedValue({
      id: 'sec-1',
      academicYearId: 'ay-1',
      schoolClass: { schoolId: 'sch-1' },
    });
    prisma.teacherSubjectAssignment.findFirst.mockResolvedValue({ id: 'tsa-1' });
    prisma.homework.create.mockResolvedValue({
      id: 'hw-1',
      title: 'Algebra 101',
      status: HomeworkStatus.DRAFT,
      schoolId: 'sch-1',
    });

    const result = await service.createHomework(
      { id: 'teacher-1', role: UserRole.TEACHER, schoolId: 'sch-1' },
      {
        classSectionId: 'sec-1',
        subjectId: 'sub-1',
        title: 'Algebra 101',
        instructions: 'Solve problems 1-10',
        dueDate: '2026-10-20T23:59:59.000Z',
      },
    );

    expect(result.id).toBe('hw-1');
    expect(prisma.homework.create).toHaveBeenCalled();
  });

  it('should reject unassigned teacher from creating homework', async () => {
    prisma.classSection.findUnique.mockResolvedValue({
      id: 'sec-1',
      schoolClass: { schoolId: 'sch-1' },
    });
    prisma.teacherSubjectAssignment.findFirst.mockResolvedValue(null);

    await expect(
      service.createHomework(
        { id: 'teacher-2', role: UserRole.TEACHER, schoolId: 'sch-1' },
        {
          classSectionId: 'sec-1',
          subjectId: 'sub-1',
          title: 'Algebra 101',
          instructions: 'Problems',
          dueDate: '2026-10-20T23:59:59.000Z',
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should detect late homework submission', async () => {
    const pastDueDate = new Date(Date.now() - 86400000); // 1 day ago
    prisma.homework.findUnique.mockResolvedValue({
      id: 'hw-1',
      status: HomeworkStatus.PUBLISHED,
      classSectionId: 'sec-1',
      dueDate: pastDueDate,
      schoolId: 'sch-1',
    });
    prisma.classEnrollment.findFirst.mockResolvedValue({ id: 'enr-1' });
    prisma.homeworkSubmission.upsert.mockResolvedValue({
      id: 'sub-1',
      isLate: true,
      status: HomeworkSubmissionStatus.LATE,
    });

    const res = await service.submitHomework(
      { id: 'student-1', role: UserRole.STUDENT, schoolId: 'sch-1' },
      'hw-1',
      { content: 'Here is my late work' },
    );

    expect(res.isLate).toBe(true);
    expect(res.status).toBe(HomeworkSubmissionStatus.LATE);
  });

  it('should reject submission from student not enrolled in class section', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      id: 'hw-1',
      status: HomeworkStatus.PUBLISHED,
      classSectionId: 'sec-1',
      dueDate: new Date(Date.now() + 86400000),
    });
    prisma.classEnrollment.findFirst.mockResolvedValue(null);

    await expect(
      service.submitHomework(
        { id: 'student-99', role: UserRole.STUDENT, schoolId: 'sch-1' },
        'hw-1',
        { content: 'Work' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject grading score exceeding max points', async () => {
    prisma.homeworkSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      homework: { schoolId: 'sch-1', teacherId: 't-1', maxPoints: 50 },
    });

    await expect(
      service.gradeSubmission(
        { id: 't-1', role: UserRole.TEACHER, schoolId: 'sch-1' },
        'sub-1',
        { grade: 55 },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow verified parent to view child homework', async () => {
    prisma.studentGuardianRelationship.findFirst.mockResolvedValue({
      verificationStatus: 'VERIFIED',
    });
    prisma.classEnrollment.findMany.mockResolvedValue([{ sectionId: 'sec-1' }]);
    prisma.homework.findMany.mockResolvedValue([
      {
        id: 'hw-1',
        title: 'Math HW',
        instructions: 'Do exercises',
        dueDate: new Date(),
        maxPoints: 100,
        status: HomeworkStatus.PUBLISHED,
        subject: { name: 'Math', code: 'MTH' },
        classSection: { name: 'A', schoolClass: { name: 'Grade 9' } },
        teacher: { firstName: 'John', lastName: 'Doe' },
        submissions: [],
      },
    ]);

    const result = await service.getStudentHomeworks(
      { id: 'parent-1', role: UserRole.PARENT, schoolId: 'sch-1' },
      'student-1',
    );

    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Math HW');
  });

  it('should block unverified parent from viewing child homework', async () => {
    prisma.studentGuardianRelationship.findFirst.mockResolvedValue(null);

    await expect(
      service.getStudentHomeworks(
        { id: 'parent-2', role: UserRole.PARENT, schoolId: 'sch-1' },
        'student-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
