/**
 * MODULE: Homework & Learning Content
 *
 * PURPOSE:
 * School-scoped homework management, assignments, student submissions with
 * late detection, teacher grading, feedback, parent visibility, and completion stats.
 *
 * DEPENDENCIES:
 * PrismaService, AuditService, School isolation, Role Guards.
 *
 * SECURITY:
 * Strict school isolation, assigned teacher checks, verified guardian access.
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateHomeworkDto,
  UpdateHomeworkDto,
  SubmitHomeworkDto,
  GradeHomeworkSubmissionDto,
  HomeworkFilterQueryDto,
} from './dto/homework.dto';
import { UserRole, HomeworkStatus, HomeworkSubmissionStatus } from '@prisma/client';

@Injectable()
export class HomeworkService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create homework assignment. Enforces teacher assignment authorization.
   */
  async createHomework(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    dto: CreateHomeworkDto,
  ) {
    const schoolId = currentUser.schoolId;
    if (!schoolId && currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('User must belong to a school');
    }

    // Verify classSection belongs to school
    const section = await this.prisma.classSection.findUnique({
      where: { id: dto.classSectionId },
      include: { schoolClass: true },
    });
    if (!section) throw new NotFoundException('Class section not found');
    if (schoolId && section.schoolClass.schoolId !== schoolId) {
      throw new ForbiddenException('Class section belongs to a different school');
    }

    // Authorization: If teacher, verify assigned to this subject and section
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
          'Teachers may only create homework for subjects and classes they are assigned to teach',
        );
      }
    }

    const homework = await this.prisma.homework.create({
      data: {
        schoolId: section.schoolClass.schoolId,
        academicYearId: dto.academicYearId || section.academicYearId,
        classSectionId: dto.classSectionId,
        subjectId: dto.subjectId,
        teacherId: currentUser.id,
        title: dto.title,
        instructions: dto.instructions,
        dueDate: new Date(dto.dueDate),
        maxPoints: dto.maxPoints ?? 100,
        status: dto.status ?? HomeworkStatus.DRAFT,
        attachments: dto.attachments,
      },
      include: {
        subject: true,
        classSection: { include: { schoolClass: true } },
        teacher: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'HOMEWORK_CREATED',
        entityType: 'Homework',
        entityId: homework.id,
        actorId: currentUser.id,
        schoolId: homework.schoolId,
        details: { title: homework.title, status: homework.status },
      },
    });

    return homework;
  }

  /**
   * Find all homework assignments matching filters, scoped by role and school.
   */
  async getHomeworks(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    query: HomeworkFilterQueryDto,
  ) {
    const effectiveSchoolId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? query.schoolId || currentUser.schoolId
        : currentUser.schoolId;

    const where: any = {};
    if (effectiveSchoolId) where.schoolId = effectiveSchoolId;
    if (query.classSectionId) where.classSectionId = query.classSectionId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.teacherId) where.teacherId = query.teacherId;

    // Students and Parents may only see PUBLISHED or CLOSED homeworks
    if (currentUser.role === UserRole.STUDENT || currentUser.role === UserRole.PARENT) {
      where.status = { in: [HomeworkStatus.PUBLISHED, HomeworkStatus.CLOSED] };
    } else if (query.status) {
      where.status = query.status;
    }

    // If student, filter by enrolled class sections
    if (currentUser.role === UserRole.STUDENT) {
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { studentId: currentUser.id, status: 'ACTIVE' },
        select: { sectionId: true },
      });
      const sectionIds = enrollments.map((e) => e.sectionId);
      where.classSectionId = { in: sectionIds };
    }

    const homeworks = await this.prisma.homework.findMany({
      where,
      include: {
        subject: true,
        classSection: { include: { schoolClass: true } },
        teacher: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: 'desc' },
    });

    return homeworks.map((hw) => ({
      id: hw.id,
      schoolId: hw.schoolId,
      academicYearId: hw.academicYearId,
      classSectionId: hw.classSectionId,
      className: hw.classSection.schoolClass.name,
      sectionName: hw.classSection.name,
      subjectId: hw.subjectId,
      subjectName: hw.subject.name,
      subjectCode: hw.subject.code,
      teacherId: hw.teacherId,
      teacherName: `${hw.teacher.firstName} ${hw.teacher.lastName}`,
      title: hw.title,
      instructions: hw.instructions,
      dueDate: hw.dueDate.toISOString(),
      maxPoints: hw.maxPoints,
      status: hw.status,
      attachments: hw.attachments,
      createdAt: hw.createdAt.toISOString(),
      updatedAt: hw.updatedAt.toISOString(),
      totalSubmissions: hw._count.submissions,
    }));
  }

  /**
   * Get single homework with submissions or student submission details.
   */
  async getHomeworkById(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    id: string,
  ) {
    const hw = await this.prisma.homework.findUnique({
      where: { id },
      include: {
        subject: true,
        classSection: { include: { schoolClass: true } },
        teacher: true,
        submissions: {
          include: { student: true, gradedBy: true },
        },
      },
    });

    if (!hw) throw new NotFoundException('Homework not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      hw.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Homework belongs to a different school');
    }

    if (
      (currentUser.role === UserRole.STUDENT || currentUser.role === UserRole.PARENT) &&
      hw.status === HomeworkStatus.DRAFT
    ) {
      throw new ForbiddenException('Draft homework is not visible');
    }

    return {
      id: hw.id,
      schoolId: hw.schoolId,
      academicYearId: hw.academicYearId,
      classSectionId: hw.classSectionId,
      className: hw.classSection.schoolClass.name,
      sectionName: hw.classSection.name,
      subjectId: hw.subjectId,
      subjectName: hw.subject.name,
      subjectCode: hw.subject.code,
      teacherId: hw.teacherId,
      teacherName: `${hw.teacher.firstName} ${hw.teacher.lastName}`,
      title: hw.title,
      instructions: hw.instructions,
      dueDate: hw.dueDate.toISOString(),
      maxPoints: hw.maxPoints,
      status: hw.status,
      attachments: hw.attachments,
      createdAt: hw.createdAt.toISOString(),
      updatedAt: hw.updatedAt.toISOString(),
      submissions: hw.submissions.map((s) => ({
        id: s.id,
        homeworkId: s.homeworkId,
        studentId: s.studentId,
        studentName: `${s.student.firstName} ${s.student.lastName}`,
        studentEmail: s.student.email,
        content: s.content,
        attachments: s.attachments,
        status: s.status,
        submittedAt: s.submittedAt.toISOString(),
        isLate: s.isLate,
        grade: s.grade,
        maxPoints: hw.maxPoints,
        feedback: s.feedback,
        gradedById: s.gradedById,
        gradedByName: s.gradedBy ? `${s.gradedBy.firstName} ${s.gradedBy.lastName}` : null,
        gradedAt: s.gradedAt ? s.gradedAt.toISOString() : null,
      })),
    };
  }

  /**
   * Update homework parameters (only assigned teacher or admin).
   */
  async updateHomework(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    id: string,
    dto: UpdateHomeworkDto,
  ) {
    const hw = await this.prisma.homework.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException('Homework not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      hw.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (currentUser.role === UserRole.TEACHER && hw.teacherId !== currentUser.id) {
      throw new ForbiddenException('Only the creating teacher can modify this homework');
    }

    const updated = await this.prisma.homework.update({
      where: { id },
      data: {
        title: dto.title,
        instructions: dto.instructions,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        maxPoints: dto.maxPoints,
        status: dto.status,
        attachments: dto.attachments,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'HOMEWORK_UPDATED',
        entityType: 'Homework',
        entityId: id,
        actorId: currentUser.id,
        schoolId: hw.schoolId,
        details: dto as any,
      },
    });

    return updated;
  }

  /**
   * Student submits work for an assignment.
   */
  async submitHomework(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    homeworkId: string,
    dto: SubmitHomeworkDto,
  ) {
    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students may submit homework');
    }

    const hw = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
    });
    if (!hw) throw new NotFoundException('Homework not found');

    if (hw.status === HomeworkStatus.DRAFT || hw.status === HomeworkStatus.ARCHIVED) {
      throw new BadRequestException('Homework is not open for submissions');
    }

    // Verify student is enrolled in the assigned class section
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        studentId: currentUser.id,
        sectionId: hw.classSectionId,
        status: 'ACTIVE',
      },
    });
    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in the class for this homework');
    }

    const now = new Date();
    const isLate = now > hw.dueDate;
    const status = isLate
      ? HomeworkSubmissionStatus.LATE
      : HomeworkSubmissionStatus.SUBMITTED;

    const submission = await this.prisma.homeworkSubmission.upsert({
      where: {
        homeworkId_studentId: {
          homeworkId,
          studentId: currentUser.id,
        },
      },
      create: {
        homeworkId,
        studentId: currentUser.id,
        content: dto.content,
        attachments: dto.attachments,
        status,
        submittedAt: now,
        isLate,
      },
      update: {
        content: dto.content,
        attachments: dto.attachments,
        status,
        submittedAt: now,
        isLate,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'HOMEWORK_SUBMITTED',
        entityType: 'HomeworkSubmission',
        entityId: submission.id,
        actorId: currentUser.id,
        schoolId: hw.schoolId,
        details: { isLate, homeworkId },
      },
    });

    return submission;
  }

  /**
   * Teacher grades a student submission.
   */
  async gradeSubmission(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    submissionId: string,
    dto: GradeHomeworkSubmissionDto,
  ) {
    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: { homework: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      submission.homework.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (
      currentUser.role === UserRole.TEACHER &&
      submission.homework.teacherId !== currentUser.id
    ) {
      throw new ForbiddenException('Only the assigned teacher can grade this submission');
    }

    if (dto.grade < 0 || dto.grade > submission.homework.maxPoints) {
      throw new BadRequestException(
        `Grade must be between 0 and maximum points (${submission.homework.maxPoints})`,
      );
    }

    const updated = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        status: HomeworkSubmissionStatus.GRADED,
        gradedById: currentUser.id,
        gradedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'HOMEWORK_GRADED',
        entityType: 'HomeworkSubmission',
        entityId: submissionId,
        actorId: currentUser.id,
        schoolId: submission.homework.schoolId,
        details: { grade: dto.grade, maxPoints: submission.homework.maxPoints },
      },
    });

    return updated;
  }

  /**
   * Get student homework list and submissions (Student or Verified Parent).
   */
  async getStudentHomeworks(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    studentId: string,
  ) {
    // Parent security: Must have verified relationship
    if (currentUser.role === UserRole.PARENT) {
      const rel = await this.prisma.studentGuardianRelationship.findFirst({
        where: {
          guardianId: currentUser.id,
          studentId,
          verificationStatus: 'VERIFIED',
        },
      });
      if (!rel) {
        throw new ForbiddenException(
          'Guardians can only view homework for verified linked children',
        );
      }
    } else if (currentUser.role === UserRole.STUDENT && currentUser.id !== studentId) {
      throw new ForbiddenException('Students can only view their own homework');
    }

    // Get active enrollment sections
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { sectionId: true },
    });
    const sectionIds = enrollments.map((e) => e.sectionId);

    const homeworks = await this.prisma.homework.findMany({
      where: {
        classSectionId: { in: sectionIds },
        status: { in: [HomeworkStatus.PUBLISHED, HomeworkStatus.CLOSED] },
      },
      include: {
        subject: true,
        classSection: { include: { schoolClass: true } },
        teacher: true,
        submissions: {
          where: { studentId },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return homeworks.map((hw) => {
      const sub = hw.submissions[0] || null;
      return {
        id: hw.id,
        title: hw.title,
        instructions: hw.instructions,
        subjectName: hw.subject.name,
        subjectCode: hw.subject.code,
        className: hw.classSection.schoolClass.name,
        sectionName: hw.classSection.name,
        teacherName: `${hw.teacher.firstName} ${hw.teacher.lastName}`,
        dueDate: hw.dueDate.toISOString(),
        maxPoints: hw.maxPoints,
        status: hw.status,
        attachments: hw.attachments,
        submission: sub
          ? {
              id: sub.id,
              content: sub.content,
              attachments: sub.attachments,
              status: sub.status,
              submittedAt: sub.submittedAt.toISOString(),
              isLate: sub.isLate,
              grade: sub.grade,
              feedback: sub.feedback,
            }
          : null,
      };
    });
  }

  /**
   * Get class completion statistics.
   */
  async getClassHomeworkStats(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    classSectionId: string,
  ) {
    if (currentUser.role !== UserRole.PLATFORM_ADMIN && currentUser.schoolId) {
      const section = await this.prisma.classSection.findUnique({
        where: { id: classSectionId },
        include: { schoolClass: true },
      });
      if (section && section.schoolClass.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const totalStudents = await this.prisma.classEnrollment.count({
      where: { sectionId: classSectionId, status: 'ACTIVE' },
    });

    const homeworks = await this.prisma.homework.findMany({
      where: { classSectionId },
      include: {
        _count: { select: { submissions: true } },
      },
    });

    const totalHomeworks = homeworks.length;
    const totalSubmissions = homeworks.reduce((acc, hw) => acc + hw._count.submissions, 0);
    const potentialSubmissions = totalHomeworks * totalStudents;
    const completionRate =
      potentialSubmissions > 0
        ? Math.round((totalSubmissions / potentialSubmissions) * 100)
        : 0;

    return {
      classSectionId,
      totalStudents,
      totalHomeworks,
      totalSubmissions,
      completionRate,
    };
  }
}
