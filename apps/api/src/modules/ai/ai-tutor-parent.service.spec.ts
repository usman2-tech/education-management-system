/**
 * Automated tests for AI Student Tutor & Parent Assistant Service (TASK 024).
 * Verifies student self-access, verified guardian-child linkage, unreleased answer key shielding,
 * zero official grade modifications, duplicate quiz rejection, and read-only fee ledgers.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AiTutorService } from './ai-tutor.service';
import { AiParentService } from './ai-parent.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from '../documents/documents.service';
import { UserRole } from '@ems/contracts';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

const mockDocumentsService = {
  searchPolicyContext: jest.fn().mockResolvedValue([]),
  findDocumentById: jest.fn(),
};

describe('AiTutorService & AiParentService - Security, Integrity & Workflows', () => {
  let tutorService: AiTutorService;
  let parentService: AiParentService;
  let mockPrisma: any;

  const studentUser: any = {
    id: 'student-uuid-1',
    email: 'student@stjude.ems.local',
    firstName: 'Alice',
    lastName: 'Johnson',
    role: UserRole.STUDENT,
    schoolId: 'school-uuid-1',
  };

  const otherStudentUser: any = {
    id: 'student-uuid-2',
    email: 'bob@stjude.ems.local',
    firstName: 'Bob',
    lastName: 'Smith',
    role: UserRole.STUDENT,
    schoolId: 'school-uuid-1',
  };

  const parentUser: any = {
    id: 'parent-uuid-1',
    email: 'parent@stjude.ems.local',
    firstName: 'Martha',
    lastName: 'Johnson',
    role: UserRole.PARENT,
    schoolId: 'school-uuid-1',
  };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === studentUser.id) {
            return Promise.resolve({
              ...studentUser,
              studentProfile: { gradeLevel: 'Grade 10' },
              classEnrollments: [],
              courseEnrollments: [
                {
                  course: {
                    id: 'course-1',
                    title: 'Calculus I',
                    code: 'MATH101',
                    subjectId: 'sub-1',
                    subject: { id: 'sub-1', name: 'Mathematics', code: 'MATH' },
                  },
                },
              ],
            });
          }
          return Promise.resolve(null);
        }),
      },
      studentPracticeQuiz: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'quiz-1', ...data })),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'quiz-1') {
            return Promise.resolve({
              id: 'quiz-1',
              studentId: studentUser.id,
              schoolId: studentUser.schoolId,
              topic: 'Quadratic Equations',
              status: 'GENERATED',
              questions: [
                {
                  id: 'q1',
                  questionNumber: 1,
                  type: 'MULTIPLE_CHOICE',
                  questionText: 'What is discriminant?',
                  options: ['b^2 - 4ac', '2a'],
                  correctAnswer: 'b^2 - 4ac',
                  explanation: 'Formula',
                },
              ],
            });
          }
          if (where.id === 'quiz-completed') {
            return Promise.resolve({
              id: 'quiz-completed',
              studentId: studentUser.id,
              schoolId: studentUser.schoolId,
              status: 'COMPLETED',
              questions: [],
            });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ ...where, ...data })),
      },
      studentRevisionPlan: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'plan-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'plan-1') {
            return Promise.resolve({
              id: 'plan-1',
              studentId: studentUser.id,
              schoolId: studentUser.schoolId,
              title: 'Physics Revision',
              plan: {},
            });
          }
          return Promise.resolve(null);
        }),
      },
      studentGrade: {
        findMany: jest.fn().mockResolvedValue([
          {
            marksObtained: 85,
            assessment: {
              maximumMarks: 100,
              subject: { name: 'Mathematics' },
              title: 'Midterm Exam',
            },
            createdAt: new Date(),
          },
        ]),
      },
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'PRESENT', markedAt: new Date(), attendanceSession: {} },
        ]),
      },
      homework: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'hw-1') {
            return Promise.resolve({
              id: 'hw-1',
              schoolId: studentUser.schoolId,
              title: 'Calculus Exercises',
              instructions: 'Solve 1-5',
              subject: { name: 'Mathematics' },
            });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      homeworkSubmission: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      feeInvoice: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'inv-1',
            invoiceNumber: 'INV-1001',
            totalAmount: 1200,
            paidAmount: 800,
            balanceAmount: 400,
            dueDate: new Date(),
            status: 'PARTIALLY_PAID',
            items: [{ name: 'Tuition Term 1', amount: 1200 }],
            payments: [{ receiptNumber: 'REC-001', amount: 800, paymentDate: new Date(), paymentMethod: 'BANK_TRANSFER' }],
          },
        ]),
      },
      studentGuardianRelationship: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.guardianId === parentUser.id && where.verificationStatus === 'VERIFIED') {
            return Promise.resolve([
              {
                id: 'rel-1',
                relationshipType: 'MOTHER',
                verificationStatus: 'VERIFIED',
                student: {
                  ...studentUser,
                  school: { id: 'school-uuid-1', name: 'St. Jude Academy', code: 'STJUDE' },
                  studentProfile: { gradeLevel: 'Grade 10', admissionNumber: 'ST-001' },
                  classEnrollments: [{ section: { schoolClass: { name: '10-A' } } }],
                },
              },
            ]);
          }
          return Promise.resolve([]);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (
            where.guardianId === parentUser.id &&
            where.studentId === studentUser.id &&
            where.verificationStatus === 'VERIFIED'
          ) {
            return Promise.resolve({
              id: 'rel-1',
              student: {
                ...studentUser,
                school: { id: 'school-uuid-1', name: 'St. Jude Academy', code: 'STJUDE' },
                studentProfile: { gradeLevel: 'Grade 10', admissionNumber: 'ST-001' },
                classEnrollments: [],
              },
            });
          }
          return Promise.resolve(null);
        }),
      },
      aIConversation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'conv-1', ...data, messages: [] })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      aIMessage: {
        create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiTutorService,
        AiParentService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key, def) => def),
          },
        },
        { provide: DocumentsService, useValue: mockDocumentsService },
      ],
    }).compile();

    tutorService = module.get<AiTutorService>(AiTutorService);
    parentService = module.get<AiParentService>(AiParentService);
  });

  describe('AI Student Tutor', () => {
    it('1. Student can retrieve their enrolled course and subject context', async () => {
      const context = await tutorService.getStudentContext(studentUser);
      expect(context.studentId).toEqual(studentUser.id);
      expect(context.courses.length).toBeGreaterThan(0);
      expect(context.courses[0].title).toEqual('Calculus I');
    });

    it('2. Concept explanation generates structured breakdown without errors', async () => {
      const explanation = await tutorService.generateConceptExplanation(
        {
          topic: 'Differential Calculus',
          difficultyLevel: 'INTERMEDIATE',
          explanationStyle: 'STEP_BY_STEP',
        },
        studentUser,
      );
      expect(explanation.title).toContain('Differential Calculus');
      expect(explanation.coreExplanation).toBeDefined();
      expect(explanation.quickCheckQuestion).toBeDefined();
    });

    it('3. Practice quiz creation saves record in GENERATED status', async () => {
      const quiz = await tutorService.generatePracticeQuiz(
        {
          topic: 'Limits & Continuity',
          questionCount: 4,
        },
        studentUser,
      );
      expect(quiz.id).toBeDefined();
      expect(quiz.status).toEqual('GENERATED');
      expect(quiz.questions.length).toBeGreaterThan(0);
      // Ensure answers are not exposed in returned student quiz
      expect((quiz.questions[0] as any).correctAnswer).toBeUndefined();
    });

    it('4. Practice quiz submission calculates formative score and marks COMPLETED', async () => {
      const submission = await tutorService.submitPracticeQuiz(
        {
          quizId: 'quiz-1',
          answers: { q1: 'b^2 - 4ac' },
        },
        studentUser,
      );
      expect(submission.status).toEqual('COMPLETED');
      expect(submission.score).toEqual(100);
      expect(submission.feedback).toBeDefined();
    });

    it('5. Duplicate practice quiz submission is strictly rejected', async () => {
      await expect(
        tutorService.submitPracticeQuiz(
          {
            quizId: 'quiz-completed',
            answers: {},
          },
          studentUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('6. Student cannot access or submit another student practice quiz', async () => {
      await expect(
        tutorService.submitPracticeQuiz(
          {
            quizId: 'quiz-1',
            answers: {},
          },
          otherStudentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('7. Personalized revision plan generation uses verified performance data', async () => {
      const plan = await tutorService.generateRevisionPlan({ timeframeDays: 7 }, studentUser);
      expect(plan.planTitle).toBeDefined();
      expect(plan.dailySchedule.length).toBeGreaterThan(0);
      expect(plan.verifiedMetrics.attendanceRate).toBeDefined();
    });

    it('8. Homework guidance provides hints without revealing answers or submitting', async () => {
      const guidance = await tutorService.getHomeworkGuidance(
        {
          homeworkId: 'hw-1',
          questionOrDoubt: 'How do I start?',
        },
        studentUser,
      );
      expect(guidance.guidanceTitle).toContain('Calculus Exercises');
      expect(guidance.conceptualHints.length).toBeGreaterThan(0);
      expect(guidance.similarWorkedExample).toBeDefined();
    });

    it('9. Learning progress summarizes verified attendance and grades', async () => {
      const progress = await tutorService.getLearningProgress(studentUser);
      expect(progress.metrics.attendanceRate).toEqual(100);
      expect(progress.insights.academicStrengths).toBeDefined();
    });
  });

  describe('AI Parent Assistant', () => {
    it('10. Parent can retrieve only verified linked children', async () => {
      const children = await parentService.getVerifiedChildren(parentUser);
      expect(children.length).toEqual(1);
      expect(children[0].id).toEqual(studentUser.id);
      expect(children[0].firstName).toEqual('Alice');
    });

    it('11. Parent access to unlinked child is strictly forbidden', async () => {
      await expect(
        parentService.getChildAcademicSummary('unrelated-student-999', parentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('12. Academic summary reflects verified student grade records', async () => {
      const summary = await parentService.getChildAcademicSummary(studentUser.id, parentUser);
      expect(summary.childName).toContain('Alice');
      expect(summary.verifiedMetrics.averagePercentage).toEqual(85);
      expect(summary.summary.executiveSummary).toBeDefined();
    });

    it('13. Attendance summary reflects verified attendance sessions', async () => {
      const attendance = await parentService.getChildAttendanceSummary(studentUser.id, parentUser);
      expect(attendance.rawStatistics.attendanceRate).toEqual(100);
      expect(attendance.summary.trendIndicator).toEqual('EXCELLENT');
    });

    it('14. Fee explanation computes authoritative outstanding balance from invoices', async () => {
      const fee = await parentService.getChildFeeExplanation(studentUser.id, parentUser);
      expect(fee.authoritativeLedger.totalInvoiced).toEqual(1200);
      expect(fee.authoritativeLedger.totalPaid).toEqual(800);
      expect(fee.authoritativeLedger.outstandingBalance).toEqual(400);
      expect(fee.explanation.summaryStatement).toContain('$400.00');
    });

    it('15. Home learning suggestions provide age-appropriate constructive guidance', async () => {
      const suggestions = await parentService.getHomeLearningSuggestions(
        { studentId: studentUser.id },
        parentUser,
      );
      expect(suggestions.routineTitle).toContain('Alice');
      expect(suggestions.dailyRoutines.length).toBeGreaterThan(0);
    });

    it('16. Parent conversational Q&A is strictly scoped to the target child', async () => {
      const chat = await parentService.askParentQuestion(
        {
          studentId: studentUser.id,
          question: 'How is Alice doing in math?',
        },
        parentUser,
      );
      expect(chat.childId).toEqual(studentUser.id);
      expect(chat.answer).toContain('Alice');
    });
  });
});
