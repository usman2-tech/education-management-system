/**
 * Automated tests for AI Teacher Copilot Service (TASK 023).
 * Verifies faculty role authorization, teacher assignments, generation workflows,
 * human-in-the-loop approval, and zero automatic publishing.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AiCopilotService } from './ai-copilot.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserRole, AICopilotContentType, AICopilotDraftStatus } from '@ems/contracts';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AiCopilotService - Authorization & Workflow Integrity', () => {
  let service: AiCopilotService;
  let mockPrisma: any;

  const teacherUser = {
    id: 'teacher-1',
    email: 'teacher@stjude.ems.local',
    role: UserRole.TEACHER,
    schoolId: 'school-1',
  };

  const studentUser = {
    id: 'student-1',
    email: 'student@stjude.ems.local',
    role: UserRole.STUDENT,
    schoolId: 'school-1',
  };

  const parentUser = {
    id: 'parent-1',
    email: 'parent@stjude.ems.local',
    role: UserRole.PARENT,
    schoolId: 'school-1',
  };

  const mockDraftRepo = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockUsageRepo = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma = {
      aICopilotDraft: mockDraftRepo,
      aiCopilotDraft: mockDraftRepo,
      aIUsageRecord: mockUsageRepo,
      aiUsageRecord: mockUsageRepo,
      classSection: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      subject: {
        findUnique: jest.fn(),
      },
      teacherSubjectAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      course: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      homework: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      homeworkSubmission: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      studentGrade: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      attendanceSession: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      classEnrollment: {
        count: jest.fn().mockResolvedValue(25),
      },
      academicYear: {
        findFirst: jest.fn().mockResolvedValue({ id: 'year-1' }),
      },
      exam: {
        create: jest.fn(),
      },
      examQuestion: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCopilotService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_k: string, defaultVal: any) => defaultVal),
          },
        },
      ],
    }).compile();

    service = module.get<AiCopilotService>(AiCopilotService);
    jest.clearAllMocks();
  });

  // 1. Role Authorization
  it('should block Student from accessing Teacher Copilot context', async () => {
    await expect(service.getTeacherContext(studentUser)).rejects.toThrow(ForbiddenException);
  });

  it('should block Parent from accessing Teacher Copilot context', async () => {
    await expect(service.getTeacherContext(parentUser)).rejects.toThrow(ForbiddenException);
  });

  // 2. Class Section Assignment Check
  it('should reject generation for an unauthorized class section', async () => {
    mockPrisma.classSection.findFirst.mockResolvedValue(null);

    await expect(
      service.generateLessonPlan(teacherUser, {
        classSectionId: 'unauthorized-section',
        topic: 'Algebra',
        learningObjectives: 'Linear equations',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should block teacher if not assigned as class teacher or subject teacher', async () => {
    mockPrisma.classSection.findFirst.mockResolvedValue({
      id: 'section-1',
      name: 'Section A',
      classTeacherId: 'other-teacher',
      teacherSubjectAssignments: [],
      schoolClass: { schoolId: 'school-1', name: 'Grade 10' },
    });

    await expect(
      service.generateLessonPlan(teacherUser, {
        classSectionId: 'section-1',
        topic: 'Algebra',
        learningObjectives: 'Linear equations',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // 3. Lesson Plan Generation
  it('should generate and save a lesson plan draft for an assigned class', async () => {
    mockPrisma.classSection.findFirst.mockResolvedValue({
      id: 'section-1',
      name: 'Section A',
      classTeacherId: teacherUser.id,
      teacherSubjectAssignments: [],
      schoolClass: { schoolId: 'school-1', name: 'Grade 10' },
    });
    mockPrisma.classSection.findUnique.mockResolvedValue({
      id: 'section-1',
      name: 'Section A',
      schoolClass: { name: 'Grade 10' },
    });

    mockDraftRepo.create.mockResolvedValue({
      id: 'draft-1',
      contentType: AICopilotContentType.LESSON_PLAN,
      status: AICopilotDraftStatus.DRAFT,
      title: 'Lesson Plan: Quadratic Equations',
    });

    const result = await service.generateLessonPlan(teacherUser, {
      classSectionId: 'section-1',
      topic: 'Quadratic Equations',
      learningObjectives: 'Factor quadratic expressions',
    });

    expect(result).toBeDefined();
    expect(mockDraftRepo.create).toHaveBeenCalled();
  });

  // 4. Homework Generation & Human Approval Workflow
  it('should generate homework as DRAFT without automatically publishing', async () => {
    mockPrisma.classSection.findFirst.mockResolvedValue({
      id: 'section-1',
      name: 'Section A',
      classTeacherId: teacherUser.id,
      teacherSubjectAssignments: [],
      schoolClass: { schoolId: 'school-1', name: 'Grade 10' },
    });
    mockPrisma.classSection.findUnique.mockResolvedValue({
      id: 'section-1',
      name: 'Section A',
      schoolClass: { name: 'Grade 10' },
    });
    mockPrisma.subject.findUnique.mockResolvedValue({
      id: 'subj-1',
      name: 'Mathematics',
    });

    mockDraftRepo.create.mockResolvedValue({
      id: 'draft-hw-1',
      contentType: AICopilotContentType.HOMEWORK,
      status: AICopilotDraftStatus.DRAFT,
      title: 'Homework: Quadratic Equations',
    });

    const draft = await service.generateHomework(teacherUser, {
      classSectionId: 'section-1',
      subjectId: 'subj-1',
      topic: 'Quadratic Equations',
      questionCount: 5,
    });

    expect(draft.status).toBe(AICopilotDraftStatus.DRAFT);
    expect(mockPrisma.homework.create).not.toHaveBeenCalled();
  });

  // 5. Human Approval Workflow: Publishing Homework
  it('should create real Homework in database ONLY when teacher explicitly approves and publishes', async () => {
    mockDraftRepo.findUnique.mockResolvedValue({
      id: 'draft-hw-1',
      schoolId: 'school-1',
      teacherId: teacherUser.id,
      contentType: AICopilotContentType.HOMEWORK,
      status: AICopilotDraftStatus.DRAFT,
      classSectionId: 'section-1',
      subjectId: 'subj-1',
      title: 'Homework: Quadratic Equations',
      content: { instructions: 'Solve all problems', maxPoints: 100 },
    });

    mockPrisma.homework.create.mockResolvedValue({
      id: 'hw-entity-1',
      title: 'Homework: Quadratic Equations',
    });

    mockDraftRepo.update.mockResolvedValue({
      id: 'draft-hw-1',
      status: AICopilotDraftStatus.PUBLISHED,
      publishedEntityId: 'hw-entity-1',
    });

    const result = await service.approveAndPublishDraft(teacherUser, 'draft-hw-1', {
      targetStatus: 'PUBLISHED',
    });

    expect(result.status).toBe(AICopilotDraftStatus.PUBLISHED);
    expect(mockPrisma.homework.create).toHaveBeenCalled();
  });

  // 6. Exam Generation & Marks Total Validation
  it('should generate an exam with questions whose marks match configured total marks', async () => {
    mockPrisma.classSection.findFirst.mockResolvedValue({
      id: 'section-1',
      name: 'Section A',
      classTeacherId: teacherUser.id,
      teacherSubjectAssignments: [],
      schoolClass: { schoolId: 'school-1', name: 'Grade 10' },
    });
    mockPrisma.classSection.findUnique.mockResolvedValue({
      id: 'section-1',
      name: 'Section A',
      schoolClass: { name: 'Grade 10' },
    });
    mockPrisma.subject.findUnique.mockResolvedValue({
      id: 'subj-1',
      name: 'Physics',
    });

    mockDraftRepo.create.mockImplementation((args: any) => {
      const data = args.data;
      const sum = data.content.questions.reduce((acc: number, q: any) => acc + q.marks, 0);
      expect(sum).toBeCloseTo(50, 1);
      return { id: 'exam-draft-1', ...data };
    });

    await service.generateExam(teacherUser, {
      classSectionId: 'section-1',
      subjectId: 'subj-1',
      topic: 'Classical Mechanics',
      totalMarks: 50,
      questionCount: 4,
    });

    expect(mockDraftRepo.create).toHaveBeenCalled();
  });

  // 7. AI Grading Suggestion does NOT overwrite grade until teacher confirms
  it('should not update student grade until teacher confirms grading suggestion', async () => {
    mockPrisma.homeworkSubmission.findUnique.mockResolvedValue({
      id: 'sub-1',
      content: 'Student solution text',
      student: { firstName: 'Liam', lastName: 'Vance' },
      homework: {
        schoolId: 'school-1',
        classSectionId: 'section-1',
        subjectId: 'subj-1',
        title: 'Homework 1',
        instructions: 'Solve problems',
        maxPoints: 100,
        classSection: { id: 'section-1' },
        subject: { id: 'subj-1' },
      },
    });

    mockPrisma.classSection.findFirst.mockResolvedValue({
      id: 'section-1',
      classTeacherId: teacherUser.id,
      teacherSubjectAssignments: [],
      schoolClass: { schoolId: 'school-1', name: 'Grade 10' },
    });

    mockDraftRepo.create.mockResolvedValue({
      id: 'draft-grade-1',
      contentType: AICopilotContentType.GRADING_SUGGESTION,
      status: AICopilotDraftStatus.DRAFT,
      content: { suggestedScore: 92, constructiveFeedback: 'Great work' },
    });

    const suggestion = await service.generateGradingSuggestion(teacherUser, {
      submissionId: 'sub-1',
    });

    expect(suggestion).toBeDefined();
    expect(mockPrisma.homeworkSubmission.update).not.toHaveBeenCalled();
  });

  // 8. Teacher Confirmation of Grade Updates HomeworkSubmission
  it('should update student grade when teacher confirms and approves draft', async () => {
    mockDraftRepo.findUnique.mockResolvedValue({
      id: 'draft-grade-1',
      schoolId: 'school-1',
      teacherId: teacherUser.id,
      contentType: AICopilotContentType.GRADING_SUGGESTION,
      status: AICopilotDraftStatus.DRAFT,
      content: { suggestedScore: 92, constructiveFeedback: 'Great work' },
      metadata: { submissionId: 'sub-1' },
    });

    mockPrisma.homeworkSubmission.update.mockResolvedValue({
      id: 'sub-1',
      grade: 92,
      status: 'GRADED',
    });

    mockDraftRepo.update.mockResolvedValue({
      id: 'draft-grade-1',
      status: AICopilotDraftStatus.APPROVED,
    });

    const result = await service.approveAndPublishDraft(teacherUser, 'draft-grade-1', {
      targetStatus: 'APPROVED',
      publishOptions: {
        teacherConfirmedScore: 92,
        teacherConfirmedFeedback: 'Verified by teacher: Excellent working shown.',
      },
    });

    expect(result.status).toBe(AICopilotDraftStatus.APPROVED);
    expect(mockPrisma.homeworkSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({
          grade: 92,
          gradedById: teacherUser.id,
          status: 'GRADED',
        }),
      }),
    );
  });
});
