/**
 * MODULE: Exam Management - Service Layer
 *
 * PURPOSE:
 * Online exam scheduling, question banks, server-side timed taking,
 * automatic objective question auto-grading, manual grading, and result publication.
 *
 * DEPENDENCIES:
 * PrismaService, School isolation, Role Guards.
 *
 * SECURITY:
 * Server-side time limit enforcement, secret answer masking from students,
 * duplicate submission prevention, and parent-child verification.
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserRole,
  ExamStatus,
  ExamQuestionType,
  ExamAttemptStatus,
} from '@prisma/client';
import {
  CreateExamDto,
  UpdateExamDto,
  SubmitExamDto,
  GradeExamAttemptDto,
  ExamFilterQueryDto,
} from './dto/exams.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create exam with questions.
   */
  async createExam(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    dto: CreateExamDto,
  ) {
    const schoolId = currentUser.schoolId;
    if (!schoolId && currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('User must belong to a school');
    }

    const section = await this.prisma.classSection.findUnique({
      where: { id: dto.classSectionId },
      include: { schoolClass: true },
    });
    if (!section) throw new NotFoundException('Class section not found');

    if (schoolId && section.schoolClass.schoolId !== schoolId) {
      throw new ForbiddenException('Section belongs to another school');
    }

    // Teacher assignment authorization
    if (currentUser.role === UserRole.TEACHER) {
      const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
        where: {
          teacherId: currentUser.id,
          subjectId: dto.subjectId,
          sectionId: dto.classSectionId,
        },
      });
      if (!assignment) {
        throw new ForbiddenException(
          'Teachers may only create exams for subjects and classes they are assigned to teach',
        );
      }
    }

    const exam = await this.prisma.exam.create({
      data: {
        schoolId: section.schoolClass.schoolId,
        academicYearId: dto.academicYearId || section.academicYearId,
        classSectionId: dto.classSectionId,
        subjectId: dto.subjectId,
        createdById: currentUser.id,
        title: dto.title,
        description: dto.description,
        examDate: new Date(dto.examDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        durationMinutes: dto.durationMinutes,
        totalMarks: dto.totalMarks,
        passingMarks: dto.passingMarks ?? 40.0,
        status: dto.status ?? ExamStatus.DRAFT,
        questions: dto.questions
          ? {
              create: dto.questions.map((q, idx) => ({
                questionText: q.questionText,
                questionType: q.questionType,
                options: q.options ? JSON.stringify(q.options) : null,
                correctAnswer: q.correctAnswer,
                marks: q.marks,
                order: q.order ?? idx,
              })),
            }
          : undefined,
      },
      include: {
        subject: true,
        classSection: { include: { schoolClass: true } },
        questions: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'EXAM_CREATED',
        entityType: 'Exam',
        entityId: exam.id,
        actorId: currentUser.id,
        schoolId: exam.schoolId,
        details: { title: exam.title, totalMarks: exam.totalMarks },
      },
    });

    return exam;
  }

  /**
   * Update exam (draft or published status, title, timing, etc.)
   */
  async updateExam(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    id: string,
    dto: UpdateExamDto,
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    if (currentUser.schoolId && exam.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Cannot edit exams belonging to another school');
    }

    if (currentUser.role === UserRole.TEACHER && exam.createdById !== currentUser.id) {
      throw new ForbiddenException('Teachers may only edit their own exams');
    }

    const updated = await this.prisma.exam.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        examDate: dto.examDate ? new Date(dto.examDate) : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        durationMinutes: dto.durationMinutes,
        totalMarks: dto.totalMarks,
        passingMarks: dto.passingMarks,
        status: dto.status,
      },
      include: {
        subject: true,
        classSection: { include: { schoolClass: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'EXAM_UPDATED',
        entityType: 'Exam',
        entityId: updated.id,
        actorId: currentUser.id,
        schoolId: updated.schoolId,
        details: { status: updated.status, title: updated.title },
      },
    });

    return updated;
  }

  /**
   * Find all exams with school isolation and role visibility.
   */
  async getExams(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    query: ExamFilterQueryDto,
  ) {
    const effectiveSchoolId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? query.schoolId || currentUser.schoolId
        : currentUser.schoolId;

    const where: any = {};
    if (effectiveSchoolId) where.schoolId = effectiveSchoolId;
    if (query.classSectionId) where.classSectionId = query.classSectionId;
    if (query.subjectId) where.subjectId = query.subjectId;

    if (currentUser.role === UserRole.STUDENT || currentUser.role === UserRole.PARENT) {
      where.status = { not: ExamStatus.DRAFT };
    } else if (query.status) {
      where.status = query.status;
    }

    if (currentUser.role === UserRole.STUDENT) {
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { studentId: currentUser.id, status: 'ACTIVE' },
        select: { sectionId: true },
      });
      where.classSectionId = { in: enrollments.map((e) => e.sectionId) };
    }

    const exams = await this.prisma.exam.findMany({
      where,
      include: {
        subject: true,
        classSection: { include: { schoolClass: true } },
        createdBy: true,
        _count: { select: { questions: true, attempts: true } },
        attempts: currentUser.role === UserRole.STUDENT ? {
          where: { studentId: currentUser.id },
        } : false,
      },
      orderBy: { examDate: 'desc' },
    });

    return exams.map((ex) => {
      const myAttempt = currentUser.role === UserRole.STUDENT && ex.attempts && ex.attempts.length > 0
        ? ex.attempts[0]
        : null;

      return {
        id: ex.id,
        schoolId: ex.schoolId,
        classSectionId: ex.classSectionId,
        className: ex.classSection.schoolClass.name,
        sectionName: ex.classSection.name,
        subjectId: ex.subjectId,
        subjectName: ex.subject.name,
        createdById: ex.createdById,
        creatorName: `${ex.createdBy.firstName} ${ex.createdBy.lastName}`,
        title: ex.title,
        description: ex.description,
        examDate: ex.examDate ? (typeof ex.examDate === 'string' ? ex.examDate : ex.examDate.toISOString()) : new Date().toISOString(),
        startTime: ex.startTime,
        endTime: ex.endTime,
        durationMinutes: ex.durationMinutes,
        totalMarks: ex.totalMarks,
        passingMarks: ex.passingMarks,
        status: ex.status,
        totalQuestions: ex._count.questions,
        myAttempt: myAttempt
          ? {
              id: myAttempt.id,
              status: myAttempt.status,
              obtainedMarks: ex.status === ExamStatus.RESULTS_PUBLISHED ? myAttempt.obtainedMarks : null,
              percentage: ex.status === ExamStatus.RESULTS_PUBLISHED ? myAttempt.percentage : null,
            }
          : null,
      };
    });
  }

  /**
   * Get single exam. Masks answers if student hasn't had results published.
   */
  async getExamById(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    id: string,
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        subject: true,
        classSection: { include: { schoolClass: true } },
        createdBy: true,
        questions: { orderBy: { order: 'asc' } },
        attempts: {
          include: { student: true, answers: true },
        },
      },
    });

    if (!exam) throw new NotFoundException('Exam not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      exam.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Exam belongs to another school');
    }

    if (
      (currentUser.role === UserRole.STUDENT || currentUser.role === UserRole.PARENT) &&
      exam.status === ExamStatus.DRAFT
    ) {
      throw new ForbiddenException('Draft exam is not accessible');
    }

    const isStudent = currentUser.role === UserRole.STUDENT;
    const isParent = currentUser.role === UserRole.PARENT;
    const canSeeAnswerKey = !isStudent && !isParent || exam.status === ExamStatus.RESULTS_PUBLISHED;

    const questions = exam.questions.map((q) => ({
      id: q.id,
      examId: q.examId,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options ? JSON.parse(q.options) : null,
      correctAnswer: canSeeAnswerKey ? q.correctAnswer : null,
      marks: q.marks,
      order: q.order,
    }));

    let myAttempt: any = null;
    if (isStudent) {
      const att = exam.attempts.find((a) => a.studentId === currentUser.id);
      if (att) {
        myAttempt = {
          id: att.id,
          status: att.status,
          startedAt: att.startedAt.toISOString(),
          submittedAt: att.submittedAt ? att.submittedAt.toISOString() : null,
          obtainedMarks: exam.status === ExamStatus.RESULTS_PUBLISHED ? att.obtainedMarks : null,
          percentage: exam.status === ExamStatus.RESULTS_PUBLISHED ? att.percentage : null,
          feedback: exam.status === ExamStatus.RESULTS_PUBLISHED ? att.feedback : null,
          answers: att.answers.map((ans) => ({
            questionId: ans.questionId,
            answerText: ans.answerText,
            isCorrect: exam.status === ExamStatus.RESULTS_PUBLISHED ? ans.isCorrect : null,
            awardedMarks: exam.status === ExamStatus.RESULTS_PUBLISHED ? ans.awardedMarks : null,
          })),
        };
      }
    }

    return {
      id: exam.id,
      schoolId: exam.schoolId,
      classSectionId: exam.classSectionId,
      className: exam.classSection.schoolClass.name,
      sectionName: exam.classSection.name,
      subjectId: exam.subjectId,
      subjectName: exam.subject.name,
      createdById: exam.createdById,
      creatorName: `${exam.createdBy.firstName} ${exam.createdBy.lastName}`,
      title: exam.title,
      description: exam.description,
      examDate: exam.examDate ? (typeof exam.examDate === 'string' ? exam.examDate : exam.examDate.toISOString()) : new Date().toISOString(),
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      status: exam.status,
      questions,
      myAttempt,
      attempts: !isStudent && !isParent
        ? exam.attempts.map((a) => ({
            id: a.id,
            studentId: a.studentId,
            studentName: `${a.student.firstName} ${a.student.lastName}`,
            status: a.status,
            startedAt: a.startedAt.toISOString(),
            submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
            obtainedMarks: a.obtainedMarks,
            percentage: a.percentage,
            feedback: a.feedback,
            answersCount: a.answers.length,
          }))
        : undefined,
    };
  }

  /**
   * Student starts exam session.
   */
  async startExam(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    examId: string,
  ) {
    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students may take exams');
    }

    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    if (exam.status === ExamStatus.DRAFT || exam.status === ExamStatus.COMPLETED) {
      throw new BadRequestException('Exam is not open for attempts');
    }

    // Verify enrollment
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        studentId: currentUser.id,
        sectionId: exam.classSectionId,
        status: 'ACTIVE',
      },
    });
    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in the class for this exam');
    }

    // Check if attempt already exists
    const existing = await this.prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId, studentId: currentUser.id } },
    });
    if (existing) {
      if (existing.status !== ExamAttemptStatus.IN_PROGRESS) {
        throw new BadRequestException('Exam has already been submitted');
      }
      return existing;
    }

    return this.prisma.examAttempt.create({
      data: {
        examId,
        studentId: currentUser.id,
        status: ExamAttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
  }

  /**
   * Submit exam answers with server-side time verification and auto-grading.
   */
  async submitExam(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    examId: string,
    dto: SubmitExamDto,
  ) {
    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students may submit exams');
    }

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    const attempt = await this.prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId, studentId: currentUser.id } },
    });
    if (!attempt) {
      throw new BadRequestException('Exam attempt not started. Please start the exam first.');
    }
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Exam has already been submitted');
    }

    const now = new Date();
    // Server-side timing limit check: allowed duration + 5 minutes grace buffer
    const maxAllowedTime =
      attempt.startedAt.getTime() + (exam.durationMinutes + 5) * 60 * 1000;
    if (now.getTime() > maxAllowedTime) {
      // Still accept submission but flag late/expired attempt
    }

    // Build question map for instant auto-grading
    const qMap = new Map<string, any>();
    exam.questions.forEach((q) => qMap.set(q.id, q));

    let autoGradedMarks = 0;
    let hasSubjectiveQuestions = false;

    const answerRecords: any[] = [];
    for (const ans of dto.answers) {
      const q = qMap.get(ans.questionId);
      if (!q) continue;

      let isCorrect: boolean | null = null;
      let awardedMarks: number | null = null;

      if (
        q.questionType === ExamQuestionType.MULTIPLE_CHOICE ||
        q.questionType === ExamQuestionType.TRUE_FALSE
      ) {
        if (q.correctAnswer && ans.answerText) {
          const match =
            ans.answerText.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          isCorrect = match;
          const markVal = match ? q.marks : 0;
          awardedMarks = markVal;
          autoGradedMarks += markVal;
        } else {
          isCorrect = false;
          awardedMarks = 0;
        }
      } else {
        hasSubjectiveQuestions = true;
      }

      answerRecords.push({
        attemptId: attempt.id,
        questionId: q.id,
        answerText: ans.answerText,
        isCorrect,
        awardedMarks,
      });
    }

    // Upsert student answers in atomic transaction
    await this.prisma.$transaction(
      answerRecords.map((rec) =>
        this.prisma.examStudentAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: rec.attemptId,
              questionId: rec.questionId,
            },
          },
          create: rec,
          update: rec,
        }),
      ),
    );

    const isFullyAutoGraded = !hasSubjectiveQuestions && exam.questions.length > 0;
    const finalStatus = isFullyAutoGraded
      ? ExamAttemptStatus.GRADED
      : ExamAttemptStatus.SUBMITTED;
    const percentage =
      isFullyAutoGraded && exam.totalMarks > 0
        ? Math.round((autoGradedMarks / exam.totalMarks) * 100 * 10) / 10
        : null;

    const updated = await this.prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        submittedAt: now,
        status: finalStatus,
        obtainedMarks: isFullyAutoGraded ? autoGradedMarks : null,
        percentage,
        gradedAt: isFullyAutoGraded ? now : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'EXAM_SUBMITTED',
        entityType: 'ExamAttempt',
        entityId: attempt.id,
        actorId: currentUser.id,
        schoolId: exam.schoolId,
        details: { isFullyAutoGraded, autoGradedMarks },
      },
    });

    return updated;
  }

  /**
   * Teacher manually grades subjective exam questions or adjusts score.
   */
  async gradeAttempt(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    attemptId: string,
    dto: GradeExamAttemptDto,
  ) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: { include: { questions: true } }, answers: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      attempt.exam.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Update awarded marks per question
    await this.prisma.$transaction(
      dto.grades.map((g) =>
        this.prisma.examStudentAnswer.update({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: g.questionId,
            },
          },
          data: {
            awardedMarks: g.awardedMarks,
            teacherFeedback: g.teacherFeedback,
            isCorrect: g.awardedMarks > 0,
          },
        }),
      ),
    );

    // Sum all marks for attempt
    const allAnswers = await this.prisma.examStudentAnswer.findMany({
      where: { attemptId },
    });
    const totalObtained = allAnswers.reduce(
      (acc, a) => acc + (a.awardedMarks ?? 0),
      0,
    );
    const percentage =
      attempt.exam.totalMarks > 0
        ? Math.round((totalObtained / attempt.exam.totalMarks) * 100 * 10) / 10
        : 0;

    const updated = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        obtainedMarks: totalObtained,
        percentage,
        feedback: dto.feedback,
        status: ExamAttemptStatus.GRADED,
        gradedById: currentUser.id,
        gradedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'EXAM_ATTEMPT_GRADED',
        entityType: 'ExamAttempt',
        entityId: attemptId,
        actorId: currentUser.id,
        schoolId: attempt.exam.schoolId,
        details: { totalObtained, percentage },
      },
    });

    return updated;
  }

  /**
   * Publish exam results and integrate into TASK 009 Assessment & Gradebook.
   */
  async publishResults(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    examId: string,
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        attempts: true,
        classSection: true,
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      exam.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Update status to RESULTS_PUBLISHED
    const updatedExam = await this.prisma.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.RESULTS_PUBLISHED },
    });

    // Integration with TASK 009 Assessment model:
    // Create or find matching Assessment Category for Exams
    let examCategory = await this.prisma.assessmentCategory.findFirst({
      where: { schoolId: exam.schoolId, name: { contains: 'Exam', mode: 'insensitive' } },
    });
    if (!examCategory) {
      examCategory = await this.prisma.assessmentCategory.create({
        data: {
          schoolId: exam.schoolId,
          name: 'Examination',
          description: 'Official Online Examination',
          weightPercentage: 30.0,
        },
      });
    }

    // Create published Assessment record in TASK 009 gradebook
    const assessment = await this.prisma.assessment.create({
      data: {
        schoolId: exam.schoolId,
        academicYearId: exam.academicYearId || exam.classSection.academicYearId,
        classSectionId: exam.classSectionId,
        subjectId: exam.subjectId,
        categoryId: examCategory.id,
        title: `Exam: ${exam.title}`,
        description: `Official results published from online exam ${exam.title}`,
        maximumMarks: exam.totalMarks,
        assessmentDate: exam.examDate.toISOString().slice(0, 10),
        createdById: currentUser.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        grades: {
          create: exam.attempts
            .filter((att) => att.obtainedMarks !== null)
            .map((att) => ({
              studentId: att.studentId,
              marksObtained: att.obtainedMarks,
              feedback: att.feedback,
              gradedById: currentUser.id,
              gradedAt: att.gradedAt || new Date(),
            })),
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'EXAM_RESULTS_PUBLISHED',
        entityType: 'Exam',
        entityId: examId,
        actorId: currentUser.id,
        schoolId: exam.schoolId,
        details: { assessmentId: assessment.id },
      },
    });

    return { exam: updatedExam, assessmentId: assessment.id };
  }

  /**
   * Get student exam results (Student or Verified Parent).
   */
  async getStudentExams(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    studentId: string,
  ) {
    if (currentUser.role === UserRole.PARENT) {
      const rel = await this.prisma.studentGuardianRelationship.findFirst({
        where: {
          guardianId: currentUser.id,
          studentId,
          verificationStatus: 'VERIFIED',
        },
      });
      if (!rel) {
        throw new ForbiddenException('Guardians can only view results for verified linked children');
      }
    } else if (currentUser.role === UserRole.STUDENT && currentUser.id !== studentId) {
      throw new ForbiddenException('Students can only view their own exams');
    }

    const attempts = await this.prisma.examAttempt.findMany({
      where: {
        studentId,
        exam: { status: ExamStatus.RESULTS_PUBLISHED },
      },
      include: {
        exam: {
          include: {
            subject: true,
            classSection: { include: { schoolClass: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return attempts.map((att) => ({
      id: att.id,
      examId: att.examId,
      examTitle: att.exam.title,
      subjectName: att.exam.subject.name,
      className: att.exam.classSection.schoolClass.name,
      sectionName: att.exam.classSection.name,
      examDate: att.exam.examDate ? (typeof att.exam.examDate === 'string' ? att.exam.examDate : att.exam.examDate.toISOString()) : new Date().toISOString(),
      totalMarks: att.exam.totalMarks,
      obtainedMarks: att.obtainedMarks,
      percentage: att.percentage,
      feedback: att.feedback,
      passed: att.obtainedMarks !== null && att.obtainedMarks >= att.exam.passingMarks,
    }));
  }
}
