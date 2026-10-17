/**
 * UNIT TESTS: ExamsService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserRole,
  ExamStatus,
  ExamQuestionType,
  ExamAttemptStatus,
} from '@prisma/client';

describe('ExamsService', () => {
  let service: ExamsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      classSection: { findUnique: jest.fn() },
      teacherSubjectAssignment: { findFirst: jest.fn() },
      exam: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      examAttempt: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      examStudentAnswer: {
        upsert: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      classEnrollment: { findFirst: jest.fn(), findMany: jest.fn() },
      studentGuardianRelationship: { findFirst: jest.fn() },
      assessmentCategory: { findFirst: jest.fn(), create: jest.fn() },
      assessment: { create: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) },
      $transaction: jest.fn().mockImplementation((arr) => Promise.all(arr)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
  });

  it('should allow assigned teacher to create an exam', async () => {
    prisma.classSection.findUnique.mockResolvedValue({
      id: 'sec-1',
      academicYearId: 'ay-1',
      schoolClass: { schoolId: 'sch-1' },
    });
    prisma.teacherSubjectAssignment.findFirst.mockResolvedValue({ id: 'tsa-1' });
    prisma.exam.create.mockResolvedValue({
      id: 'ex-1',
      title: 'Midterm Exam',
      totalMarks: 100,
      schoolId: 'sch-1',
    });

    const res = await service.createExam(
      { id: 't-1', role: UserRole.TEACHER, schoolId: 'sch-1' },
      {
        classSectionId: 'sec-1',
        subjectId: 'sub-1',
        title: 'Midterm Exam',
        examDate: '2026-10-25T09:00:00.000Z',
        durationMinutes: 60,
        totalMarks: 100,
      },
    );

    expect(res.id).toBe('ex-1');
    expect(prisma.exam.create).toHaveBeenCalled();
  });

  it('should mask correct answer keys from students before results are published', async () => {
    prisma.exam.findUnique.mockResolvedValue({
      id: 'ex-1',
      schoolId: 'sch-1',
      status: ExamStatus.SCHEDULED,
      classSection: { name: 'A', schoolClass: { name: '10' } },
      subject: { name: 'Physics' },
      createdBy: { firstName: 'Alice', lastName: 'Prof' },
      questions: [
        {
          id: 'q-1',
          questionText: 'What is G?',
          questionType: ExamQuestionType.MULTIPLE_CHOICE,
          options: '["9.8", "10", "8.5"]',
          correctAnswer: '9.8',
          marks: 5,
        },
      ],
      attempts: [],
    });

    const exam = await service.getExamById(
      { id: 'student-1', role: UserRole.STUDENT, schoolId: 'sch-1' },
      'ex-1',
    );

    expect(exam.questions[0].correctAnswer).toBeNull();
  });

  it('should automatically grade objective MCQ answers on submission', async () => {
    prisma.exam.findUnique.mockResolvedValue({
      id: 'ex-1',
      schoolId: 'sch-1',
      durationMinutes: 60,
      totalMarks: 10,
      questions: [
        {
          id: 'q-1',
          questionType: ExamQuestionType.MULTIPLE_CHOICE,
          correctAnswer: 'Oxygen',
          marks: 10,
        },
      ],
    });
    prisma.examAttempt.findUnique.mockResolvedValue({
      id: 'att-1',
      startedAt: new Date(Date.now() - 600000), // 10 minutes ago
      status: ExamAttemptStatus.IN_PROGRESS,
    });
    prisma.examAttempt.update.mockResolvedValue({
      id: 'att-1',
      status: ExamAttemptStatus.GRADED,
      obtainedMarks: 10,
      percentage: 100,
    });

    const res = await service.submitExam(
      { id: 'student-1', role: UserRole.STUDENT, schoolId: 'sch-1' },
      'ex-1',
      {
        answers: [{ questionId: 'q-1', answerText: 'Oxygen' }],
      },
    );

    expect(res.status).toBe(ExamAttemptStatus.GRADED);
    expect(res.obtainedMarks).toBe(10);
    expect(res.percentage).toBe(100);
  });

  it('should publish exam results and integrate into Task 009 Assessment model', async () => {
    prisma.exam.findUnique.mockResolvedValue({
      id: 'ex-1',
      schoolId: 'sch-1',
      title: 'Final Exam',
      totalMarks: 100,
      examDate: new Date(),
      subjectId: 'sub-1',
      classSectionId: 'sec-1',
      classSection: { academicYearId: 'ay-1' },
      attempts: [
        {
          studentId: 'stud-1',
          obtainedMarks: 88,
          feedback: 'Great performance',
          gradedAt: new Date(),
        },
      ],
    });
    prisma.exam.update.mockResolvedValue({ id: 'ex-1', status: ExamStatus.RESULTS_PUBLISHED });
    prisma.assessmentCategory.findFirst.mockResolvedValue({ id: 'cat-1' });
    prisma.assessment.create.mockResolvedValue({ id: 'asst-1' });

    const published = await service.publishResults(
      { id: 'teacher-1', role: UserRole.TEACHER, schoolId: 'sch-1' },
      'ex-1',
    );

    expect(published.assessmentId).toBe('asst-1');
    expect(prisma.assessment.create).toHaveBeenCalled();
  });

  it('should allow verified parent to view student exam results', async () => {
    prisma.studentGuardianRelationship.findFirst.mockResolvedValue({
      verificationStatus: 'VERIFIED',
    });
    prisma.examAttempt.findMany.mockResolvedValue([
      {
        id: 'att-1',
        examId: 'ex-1',
        obtainedMarks: 90,
        percentage: 90,
        exam: {
          title: 'Midterm',
          totalMarks: 100,
          passingMarks: 40,
          examDate: new Date(),
          subject: { name: 'Chemistry' },
          classSection: { name: 'A', schoolClass: { name: 'Grade 10' } },
        },
      },
    ]);

    const res = await service.getStudentExams(
      { id: 'parent-1', role: UserRole.PARENT, schoolId: 'sch-1' },
      'student-1',
    );

    expect(res.length).toBe(1);
    expect(res[0].passed).toBe(true);
    expect(res[0].obtainedMarks).toBe(90);
  });
});
