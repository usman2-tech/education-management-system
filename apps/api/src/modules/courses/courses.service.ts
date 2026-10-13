/**
 * MODULE: Course Management - Service Layer
 *
 * PURPOSE:
 * School-specific course catalog, modules & lesson creation, student enrollment,
 * lesson completion tracking, and progress percentage calculations.
 *
 * DEPENDENCIES:
 * PrismaService, School isolation, Role Guards.
 *
 * SECURITY:
 * Multi-tenant isolation, verified guardian access, enrollment checks.
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, EnrollmentStatus } from '@prisma/client';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateCourseModuleDto,
  CreateCourseLessonDto,
  CourseFilterQueryDto,
} from './dto/courses.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new course in the school's catalog.
   */
  async createCourse(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    dto: CreateCourseDto,
  ) {
    const schoolId = currentUser.schoolId;
    if (!schoolId && currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('User must belong to a school');
    }

    // Check code uniqueness within school
    const existing = await this.prisma.course.findFirst({
      where: { schoolId: schoolId!, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Course with code ${dto.code} already exists in this school`);
    }

    const course = await this.prisma.course.create({
      data: {
        schoolId: schoolId!,
        subjectId: dto.subjectId,
        title: dto.title,
        code: dto.code,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        published: dto.published ?? false,
        createdById: currentUser.id,
      },
      include: { subject: true, createdBy: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'COURSE_CREATED',
        entityType: 'Course',
        entityId: course.id,
        actorId: currentUser.id,
        schoolId: course.schoolId,
        details: { title: course.title, code: course.code },
      },
    });

    return course;
  }

  /**
   * Get courses matching query with school isolation.
   */
  async getCourses(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    query: CourseFilterQueryDto,
  ) {
    const effectiveSchoolId =
      currentUser.role === UserRole.PLATFORM_ADMIN
        ? query.schoolId || currentUser.schoolId
        : currentUser.schoolId;

    const where: any = {};
    if (effectiveSchoolId) where.schoolId = effectiveSchoolId;
    if (query.subjectId) where.subjectId = query.subjectId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Students only see published courses unless already enrolled
    if (currentUser.role === UserRole.STUDENT) {
      where.published = true;
    } else if (query.published !== undefined) {
      where.published = query.published;
    }

    const courses = await this.prisma.course.findMany({
      where,
      include: {
        subject: true,
        createdBy: true,
        school: true,
        modules: {
          include: {
            lessons: true,
          },
        },
        enrollments: currentUser.role === UserRole.STUDENT ? {
          where: { studentId: currentUser.id },
        } : false,
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return courses.map((c) => {
      let totalLessons = 0;
      c.modules?.forEach((m) => {
        totalLessons += m.lessons?.length || 0;
      });

      const isEnrolled = currentUser.role === UserRole.STUDENT && (c.enrollments?.length ?? 0) > 0;

      return {
        id: c.id,
        schoolId: c.schoolId,
        schoolName: c.school.name,
        subjectId: c.subjectId,
        subjectName: c.subject?.name || null,
        title: c.title,
        code: c.code,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        published: c.published,
        createdById: c.createdById,
        creatorName: `${c.createdBy.firstName} ${c.createdBy.lastName}`,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        totalModules: c._count.modules,
        totalLessons,
        enrolledStudentsCount: c._count.enrollments,
        isEnrolled,
      };
    });
  }

  /**
   * Get single course with full module & lesson syllabus and student completion states.
   */
  async getCourseById(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    id: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        subject: true,
        createdBy: true,
        school: true,
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      course.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Course belongs to a different school');
    }

    // If student, calculate lesson progress
    let completedLessonIds = new Set<string>();
    let isEnrolled = false;

    if (currentUser.role === UserRole.STUDENT) {
      const enrollment = await this.prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId: id, studentId: currentUser.id } },
      });
      isEnrolled = !!enrollment;

      if (isEnrolled) {
        const progress = await this.prisma.lessonProgress.findMany({
          where: { studentId: currentUser.id, isCompleted: true },
          select: { lessonId: true },
        });
        progress.forEach((p) => completedLessonIds.add(p.lessonId));
      }
    }

    let totalLessonsCount = 0;
    let completedLessonsCount = 0;

    const modules = course.modules.map((m) => {
      const lessons = m.lessons.map((l) => {
        totalLessonsCount++;
        const isCompleted = completedLessonIds.has(l.id);
        if (isCompleted) completedLessonsCount++;

        return {
          id: l.id,
          moduleId: l.moduleId,
          title: l.title,
          content: l.content,
          videoUrl: l.videoUrl,
          attachments: l.attachments,
          order: l.order,
          durationMinutes: l.durationMinutes,
          isCompleted,
        };
      });

      return {
        id: m.id,
        courseId: m.courseId,
        title: m.title,
        description: m.description,
        order: m.order,
        lessons,
      };
    });

    const progressPercentage =
      totalLessonsCount > 0
        ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
        : 0;

    return {
      id: course.id,
      schoolId: course.schoolId,
      schoolName: course.school.name,
      subjectId: course.subjectId,
      subjectName: course.subject?.name || null,
      title: course.title,
      code: course.code,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      published: course.published,
      createdById: course.createdById,
      creatorName: `${course.createdBy.firstName} ${course.createdBy.lastName}`,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      modules,
      totalModules: course.modules.length,
      totalLessons: totalLessonsCount,
      enrolledStudentsCount: course._count.enrollments,
      isEnrolled,
      progressPercentage,
    };
  }

  /**
   * Update course details.
   */
  async updateCourse(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    id: string,
    dto: UpdateCourseDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      course.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        title: dto.title,
        code: dto.code,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        published: dto.published,
        subjectId: dto.subjectId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'COURSE_UPDATED',
        entityType: 'Course',
        entityId: id,
        actorId: currentUser.id,
        schoolId: course.schoolId,
        details: dto as any,
      },
    });

    return updated;
  }

  /**
   * Add a module to a course.
   */
  async createModule(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    courseId: string,
    dto: CreateCourseModuleDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      course.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.courseModule.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        order: dto.order ?? 0,
      },
    });
  }

  /**
   * Add a lesson to a module.
   */
  async createLesson(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    moduleId: string,
    dto: CreateCourseLessonDto,
  ) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      module.course.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.courseLesson.create({
      data: {
        moduleId,
        title: dto.title,
        content: dto.content,
        videoUrl: dto.videoUrl,
        attachments: dto.attachments,
        order: dto.order ?? 0,
        durationMinutes: dto.durationMinutes ?? 30,
      },
    });
  }

  /**
   * Student enrolls in a published course.
   */
  async enrollCourse(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    courseId: string,
  ) {
    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can enroll in courses');
    }

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (!course.published) throw new BadRequestException('Cannot enroll in an unpublished course');

    if (currentUser.schoolId && course.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Cannot enroll in a course from another school');
    }

    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: { courseId_studentId: { courseId, studentId: currentUser.id } },
      create: {
        courseId,
        studentId: currentUser.id,
        status: EnrollmentStatus.ACTIVE,
      },
      update: {
        status: EnrollmentStatus.ACTIVE,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'COURSE_ENROLLED',
        entityType: 'CourseEnrollment',
        entityId: enrollment.id,
        actorId: currentUser.id,
        schoolId: course.schoolId,
        details: { courseId, studentId: currentUser.id },
      },
    });

    return enrollment;
  }

  /**
   * Toggle or complete lesson progress.
   */
  async completeLesson(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    lessonId: string,
  ) {
    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students track lesson progress');
    }

    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const courseId = lesson.module.courseId;

    // Check enrollment
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: currentUser.id } },
    });
    if (!enrollment) {
      throw new ForbiddenException('You must be enrolled in the course to complete lessons');
    }

    const progress = await this.prisma.lessonProgress.upsert({
      where: { lessonId_studentId: { lessonId, studentId: currentUser.id } },
      create: {
        lessonId,
        studentId: currentUser.id,
        isCompleted: true,
      },
      update: {
        isCompleted: true,
      },
    });

    // Check if entire course is now completed
    const allCourseLessons = await this.prisma.courseLesson.findMany({
      where: { module: { courseId } },
      select: { id: true },
    });

    const completedCount = await this.prisma.lessonProgress.count({
      where: {
        studentId: currentUser.id,
        lessonId: { in: allCourseLessons.map((l) => l.id) },
        isCompleted: true,
      },
    });

    if (completedCount >= allCourseLessons.length && allCourseLessons.length > 0) {
      await this.prisma.courseEnrollment.update({
        where: { courseId_studentId: { courseId, studentId: currentUser.id } },
        data: {
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }

    return progress;
  }

  /**
   * Get enrolled courses for a student (Student or Verified Parent).
   */
  async getStudentCourses(
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
        throw new ForbiddenException('Guardians can only view courses for verified linked children');
      }
    } else if (currentUser.role === UserRole.STUDENT && currentUser.id !== studentId) {
      throw new ForbiddenException('Students can only view their own courses');
    }

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            modules: {
              include: { lessons: true },
            },
          },
        },
      },
    });

    const studentCompleted = await this.prisma.lessonProgress.findMany({
      where: { studentId, isCompleted: true },
      select: { lessonId: true },
    });
    const completedSet = new Set(studentCompleted.map((p) => p.lessonId));

    return enrollments.map((enr) => {
      let totalLessons = 0;
      let completedLessons = 0;

      enr.course.modules.forEach((m) => {
        m.lessons.forEach((l) => {
          totalLessons++;
          if (completedSet.has(l.id)) completedLessons++;
        });
      });

      const progressPercentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        id: enr.id,
        courseId: enr.courseId,
        courseTitle: enr.course.title,
        courseCode: enr.course.code,
        studentId: enr.studentId,
        enrolledAt: enr.enrolledAt.toISOString(),
        status: enr.status,
        completedAt: enr.completedAt ? enr.completedAt.toISOString() : null,
        totalLessonsCount: totalLessons,
        completedLessonsCount: completedLessons,
        progressPercentage,
      };
    });
  }
}
