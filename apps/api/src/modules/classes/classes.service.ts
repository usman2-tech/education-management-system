/**
 * MODULE: Classes & Timetables - Classes Service
 *
 * PURPOSE:
 * Academic structure administration: Academic Years, Classes, Sections, Subjects,
 * Class Enrollments, Teacher Subject Assignments, and Timetable scheduling with
 * comprehensive conflict detection (teacher, section, and room overlaps).
 *
 * DEPENDENCIES:
 * PrismaService, @ems/contracts
 *
 * SECURITY:
 * Strict school tenancy isolation enforced across all academic resources.
 * Only School Admin (or Platform Admin) can manage academic structures.
 * Teachers can only view assigned schedules.
 * Students can only view their own class schedule.
 * Parents can only view timetable for verified linked children.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUser,
  UserRole,
  AcademicYearDto,
  SchoolClassDto,
  ClassSectionDto,
  SubjectDto,
  ClassEnrollmentDto,
  TeacherSubjectAssignmentDto,
  TimetableEntryDto,
  TimetableConflictDto,
  EnrollmentStatus,
  RelationshipVerificationStatus,
} from '@ems/contracts';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateSchoolClassDto,
  UpdateSchoolClassDto,
  CreateClassSectionDto,
  UpdateClassSectionDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  EnrollStudentDto,
  AssignTeacherSubjectDto,
  CreateTimetableEntryDto,
  UpdateTimetableEntryDto,
  CreateStudentDto,
  UpdateStudentDto,
} from './dto/classes.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // TENANCY & PERMISSIONS HELPERS
  // ---------------------------------------------------------------------------

  private resolveSchoolId(currentUser: AuthUser, requestedSchoolId?: string): string {
    if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      if (requestedSchoolId) return requestedSchoolId;
      if (currentUser.schoolId) return currentUser.schoolId;
      throw new BadRequestException('schoolId must be specified for Platform Administrator.');
    }

    if (!currentUser.schoolId) {
      throw new ForbiddenException('User is not associated with an authorized school tenant.');
    }

    if (requestedSchoolId && requestedSchoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Cannot perform operations outside your assigned school tenant.');
    }

    return currentUser.schoolId;
  }

  private assertAdminAccess(currentUser: AuthUser): void {
    if (
      currentUser.role !== UserRole.SCHOOL_ADMIN &&
      currentUser.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException('Administrative privileges required for academic structure management.');
    }
  }

  // ---------------------------------------------------------------------------
  // ACADEMIC YEARS
  // ---------------------------------------------------------------------------

  async createAcademicYear(dto: CreateAcademicYearDto, currentUser: AuthUser): Promise<AcademicYearDto> {
    this.assertAdminAccess(currentUser);
    const schoolId = this.resolveSchoolId(currentUser, dto.schoolId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (startDate >= endDate) {
      throw new BadRequestException('Academic year startDate must precede endDate.');
    }

    // Check duplicate name within school
    const existing = await this.prisma.academicYear.findUnique({
      where: { schoolId_name: { schoolId, name: dto.name.trim() } },
    });
    if (existing) {
      throw new ConflictException(`Academic year "${dto.name}" already exists for this school.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isCurrent) {
        // Unset any existing current academic year for this school
        await tx.academicYear.updateMany({
          where: { schoolId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      const created = await tx.academicYear.create({
        data: {
          schoolId,
          name: dto.name.trim(),
          startDate,
          endDate,
          isCurrent: dto.isCurrent !== undefined ? dto.isCurrent : true,
        },
      });

      return {
        id: created.id,
        schoolId: created.schoolId,
        name: created.name,
        startDate: created.startDate.toISOString(),
        endDate: created.endDate.toISOString(),
        isCurrent: created.isCurrent,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    });
  }

  async getAcademicYears(currentUser: AuthUser, schoolIdParam?: string): Promise<AcademicYearDto[]> {
    const schoolId = this.resolveSchoolId(currentUser, schoolIdParam);

    const years = await this.prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        _count: { select: { sections: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    return years.map((y) => ({
      id: y.id,
      schoolId: y.schoolId,
      name: y.name,
      startDate: y.startDate.toISOString(),
      endDate: y.endDate.toISOString(),
      isCurrent: y.isCurrent,
      createdAt: y.createdAt.toISOString(),
      updatedAt: y.updatedAt.toISOString(),
      sectionsCount: y._count.sections,
    }));
  }

  async updateAcademicYear(
    id: string,
    dto: UpdateAcademicYearDto,
    currentUser: AuthUser,
  ): Promise<AcademicYearDto> {
    this.assertAdminAccess(currentUser);

    const existing = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Academic year not found.');
    this.resolveSchoolId(currentUser, existing.schoolId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isCurrent) {
        await tx.academicYear.updateMany({
          where: { schoolId: existing.schoolId, isCurrent: true, id: { not: id } },
          data: { isCurrent: false },
        });
      }

      const updated = await tx.academicYear.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          isCurrent: dto.isCurrent,
        },
      });

      return {
        id: updated.id,
        schoolId: updated.schoolId,
        name: updated.name,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
        isCurrent: updated.isCurrent,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }

  // ---------------------------------------------------------------------------
  // SCHOOL CLASSES & SECTIONS
  // ---------------------------------------------------------------------------

  async createClass(dto: CreateSchoolClassDto, currentUser: AuthUser): Promise<SchoolClassDto> {
    this.assertAdminAccess(currentUser);
    const schoolId = this.resolveSchoolId(currentUser, dto.schoolId);

    const existingCode = await this.prisma.schoolClass.findUnique({
      where: { schoolId_code: { schoolId, code: dto.code.trim().toUpperCase() } },
    });
    if (existingCode) {
      throw new ConflictException(`A class with code "${dto.code.toUpperCase()}" already exists.`);
    }

    const created = await this.prisma.schoolClass.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description?.trim() || null,
        order: dto.order ?? 0,
      },
    });

    return {
      id: created.id,
      schoolId: created.schoolId,
      name: created.name,
      code: created.code,
      description: created.description,
      order: created.order,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      sectionsCount: 0,
    };
  }

  async getClasses(currentUser: AuthUser, schoolIdParam?: string): Promise<SchoolClassDto[]> {
    const schoolId = this.resolveSchoolId(currentUser, schoolIdParam);

    const classes = await this.prisma.schoolClass.findMany({
      where: { schoolId },
      include: {
        _count: { select: { sections: true } },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return classes.map((c) => ({
      id: c.id,
      schoolId: c.schoolId,
      name: c.name,
      code: c.code,
      description: c.description,
      order: c.order,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      sectionsCount: c._count.sections,
    }));
  }

  async getClassById(id: string, currentUser: AuthUser): Promise<SchoolClassDto & { sections: ClassSectionDto[] }> {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            schoolClass: true,
            academicYear: true,
            classTeacher: { select: { id: true, firstName: true, lastName: true, email: true } },
            _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
          },
        },
      },
    });

    if (!schoolClass) throw new NotFoundException('School class not found.');
    this.resolveSchoolId(currentUser, schoolClass.schoolId);

    const sections: ClassSectionDto[] = schoolClass.sections.map((s) => ({
      id: s.id,
      classId: s.classId,
      className: schoolClass.name,
      classCode: schoolClass.code,
      academicYearId: s.academicYearId,
      academicYearName: s.academicYear.name,
      name: s.name,
      capacity: s.capacity,
      roomNumber: s.roomNumber,
      classTeacherId: s.classTeacherId,
      classTeacher: s.classTeacher,
      enrolledStudentsCount: s._count.enrollments,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return {
      id: schoolClass.id,
      schoolId: schoolClass.schoolId,
      name: schoolClass.name,
      code: schoolClass.code,
      description: schoolClass.description,
      order: schoolClass.order,
      createdAt: schoolClass.createdAt.toISOString(),
      updatedAt: schoolClass.updatedAt.toISOString(),
      sectionsCount: sections.length,
      sections,
    };
  }

  async updateClass(id: string, dto: UpdateSchoolClassDto, currentUser: AuthUser): Promise<SchoolClassDto> {
    this.assertAdminAccess(currentUser);
    const existing = await this.prisma.schoolClass.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('School class not found.');
    this.resolveSchoolId(currentUser, existing.schoolId);

    const updated = await this.prisma.schoolClass.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        order: dto.order,
      },
    });

    return {
      id: updated.id,
      schoolId: updated.schoolId,
      name: updated.name,
      code: updated.code,
      description: updated.description,
      order: updated.order,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async createSection(dto: CreateClassSectionDto, currentUser: AuthUser): Promise<ClassSectionDto> {
    this.assertAdminAccess(currentUser);

    const schoolClass = await this.prisma.schoolClass.findUnique({ where: { id: dto.classId } });
    if (!schoolClass) throw new NotFoundException('Class not found.');
    this.resolveSchoolId(currentUser, schoolClass.schoolId);

    const academicYear = await this.prisma.academicYear.findUnique({ where: { id: dto.academicYearId } });
    if (!academicYear) throw new NotFoundException('Academic year not found.');
    if (academicYear.schoolId !== schoolClass.schoolId) {
      throw new BadRequestException('Academic year does not belong to the same school as the class.');
    }

    if (dto.classTeacherId) {
      const teacher = await this.prisma.user.findUnique({ where: { id: dto.classTeacherId } });
      if (!teacher || teacher.role !== UserRole.TEACHER) {
        throw new BadRequestException('Assigned class teacher must be a valid Teacher account.');
      }
    }

    const existingSection = await this.prisma.classSection.findUnique({
      where: {
        classId_academicYearId_name: {
          classId: dto.classId,
          academicYearId: dto.academicYearId,
          name: dto.name.trim(),
        },
      },
    });
    if (existingSection) {
      throw new ConflictException(`Section "${dto.name}" already exists for this class and academic year.`);
    }

    const section = await this.prisma.classSection.create({
      data: {
        classId: dto.classId,
        academicYearId: dto.academicYearId,
        name: dto.name.trim(),
        capacity: dto.capacity ?? 30,
        roomNumber: dto.roomNumber?.trim() || null,
        classTeacherId: dto.classTeacherId || null,
      },
      include: {
        schoolClass: true,
        academicYear: true,
        classTeacher: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return {
      id: section.id,
      classId: section.classId,
      className: section.schoolClass.name,
      classCode: section.schoolClass.code,
      academicYearId: section.academicYearId,
      academicYearName: section.academicYear.name,
      name: section.name,
      capacity: section.capacity,
      roomNumber: section.roomNumber,
      classTeacherId: section.classTeacherId,
      classTeacher: section.classTeacher,
      enrolledStudentsCount: 0,
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
    };
  }

  async updateSection(id: string, dto: UpdateClassSectionDto, currentUser: AuthUser): Promise<ClassSectionDto> {
    this.assertAdminAccess(currentUser);
    const existing = await this.prisma.classSection.findUnique({
      where: { id },
      include: { schoolClass: true },
    });
    if (!existing) throw new NotFoundException('Section not found.');
    this.resolveSchoolId(currentUser, existing.schoolClass.schoolId);

    const updated = await this.prisma.classSection.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        capacity: dto.capacity,
        roomNumber: dto.roomNumber?.trim(),
        classTeacherId: dto.classTeacherId,
      },
      include: {
        schoolClass: true,
        academicYear: true,
        classTeacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
      },
    });

    return {
      id: updated.id,
      classId: updated.classId,
      className: updated.schoolClass.name,
      classCode: updated.schoolClass.code,
      academicYearId: updated.academicYearId,
      academicYearName: updated.academicYear.name,
      name: updated.name,
      capacity: updated.capacity,
      roomNumber: updated.roomNumber,
      classTeacherId: updated.classTeacherId,
      classTeacher: updated.classTeacher,
      enrolledStudentsCount: updated._count.enrollments,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getSections(academicYearId?: string, classId?: string, currentUser?: AuthUser): Promise<ClassSectionDto[]> {
    const where: any = {};
    if (classId) where.classId = classId;
    if (academicYearId) where.academicYearId = academicYearId;

    if (currentUser && currentUser.role !== UserRole.PLATFORM_ADMIN && currentUser.schoolId) {
      where.schoolClass = { schoolId: currentUser.schoolId };
    }

    const sections = await this.prisma.classSection.findMany({
      where,
      include: {
        schoolClass: true,
        academicYear: true,
        classTeacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
      },
      orderBy: [{ schoolClass: { order: 'asc' } }, { name: 'asc' }],
    });

    return sections.map((s) => ({
      id: s.id,
      classId: s.classId,
      className: s.schoolClass.name,
      classCode: s.schoolClass.code,
      academicYearId: s.academicYearId,
      academicYearName: s.academicYear.name,
      name: s.name,
      capacity: s.capacity,
      roomNumber: s.roomNumber,
      classTeacherId: s.classTeacherId,
      classTeacher: s.classTeacher,
      enrolledStudentsCount: s._count.enrollments,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  // ---------------------------------------------------------------------------
  // SUBJECTS
  // ---------------------------------------------------------------------------

  async createSubject(dto: CreateSubjectDto, currentUser: AuthUser): Promise<SubjectDto> {
    this.assertAdminAccess(currentUser);
    const schoolId = this.resolveSchoolId(currentUser, dto.schoolId);

    const existing = await this.prisma.subject.findUnique({
      where: { schoolId_code: { schoolId, code: dto.code.trim().toUpperCase() } },
    });
    if (existing) {
      throw new ConflictException(`Subject code "${dto.code.toUpperCase()}" already exists for this school.`);
    }

    const subject = await this.prisma.subject.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        department: dto.department?.trim() || null,
        credits: dto.credits ?? 1.0,
      },
    });

    return {
      id: subject.id,
      schoolId: subject.schoolId,
      name: subject.name,
      code: subject.code,
      department: subject.department,
      credits: subject.credits,
      createdAt: subject.createdAt.toISOString(),
      updatedAt: subject.updatedAt.toISOString(),
    };
  }

  async updateSubject(id: string, dto: UpdateSubjectDto, currentUser: AuthUser): Promise<SubjectDto> {
    this.assertAdminAccess(currentUser);
    const existing = await this.prisma.subject.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subject not found.');
    this.resolveSchoolId(currentUser, existing.schoolId);

    const updated = await this.prisma.subject.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        department: dto.department?.trim(),
        credits: dto.credits,
      },
    });

    return {
      id: updated.id,
      schoolId: updated.schoolId,
      name: updated.name,
      code: updated.code,
      department: updated.department,
      credits: updated.credits,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getSubjects(currentUser: AuthUser, schoolIdParam?: string): Promise<SubjectDto[]> {
    const schoolId = this.resolveSchoolId(currentUser, schoolIdParam);

    const subjects = await this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    return subjects.map((s) => ({
      id: s.id,
      schoolId: s.schoolId,
      name: s.name,
      code: s.code,
      department: s.department,
      credits: s.credits,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  // ---------------------------------------------------------------------------
  // STUDENT ENROLLMENTS
  // ---------------------------------------------------------------------------

  async enrollStudent(
    sectionId: string,
    dto: EnrollStudentDto,
    currentUser: AuthUser,
  ): Promise<ClassEnrollmentDto> {
    this.assertAdminAccess(currentUser);

    const section = await this.prisma.classSection.findUnique({
      where: { id: sectionId },
      include: { schoolClass: true },
    });
    if (!section) throw new NotFoundException('Section not found.');
    this.resolveSchoolId(currentUser, section.schoolClass.schoolId);

    // Verify student exists and belongs to this school
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
      include: { studentProfile: true },
    });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student user not found.');
    }
    if (student.schoolId !== section.schoolClass.schoolId) {
      throw new ForbiddenException('Student is not registered with this school.');
    }

    // Capacity check
    const activeCount = await this.prisma.classEnrollment.count({
      where: { sectionId, status: EnrollmentStatus.ACTIVE },
    });
    if (activeCount >= section.capacity) {
      throw new BadRequestException(`Section "${section.name}" is already at maximum capacity (${section.capacity}).`);
    }

    // Prevent duplicate enrollment in the same academic year
    const existingEnrollment = await this.prisma.classEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: dto.studentId,
          academicYearId: section.academicYearId,
        },
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.sectionId === sectionId && existingEnrollment.status === EnrollmentStatus.ACTIVE) {
        throw new ConflictException('Student is already actively enrolled in this section.');
      }
      // Update section and reactivate
      const updated = await this.prisma.classEnrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          sectionId,
          rollNumber: dto.rollNumber?.trim() || existingEnrollment.rollNumber,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              studentProfile: { select: { admissionNumber: true } },
            },
          },
        },
      });

      return {
        id: updated.id,
        studentId: updated.studentId,
        student: {
          id: updated.student.id,
          firstName: updated.student.firstName,
          lastName: updated.student.lastName,
          email: updated.student.email,
          admissionNumber: updated.student.studentProfile?.admissionNumber || null,
        },
        sectionId: updated.sectionId,
        academicYearId: updated.academicYearId,
        rollNumber: updated.rollNumber,
        enrolledAt: updated.enrolledAt.toISOString(),
        status: updated.status as EnrollmentStatus,
      };
    }

    const created = await this.prisma.classEnrollment.create({
      data: {
        studentId: dto.studentId,
        sectionId,
        academicYearId: section.academicYearId,
        rollNumber: dto.rollNumber?.trim() || null,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentProfile: { select: { admissionNumber: true } },
          },
        },
      },
    });

    return {
      id: created.id,
      studentId: created.studentId,
      student: {
        id: created.student.id,
        firstName: created.student.firstName,
        lastName: created.student.lastName,
        email: created.student.email,
        admissionNumber: created.student.studentProfile?.admissionNumber || null,
      },
      sectionId: created.sectionId,
      academicYearId: created.academicYearId,
      rollNumber: created.rollNumber,
      enrolledAt: created.enrolledAt.toISOString(),
      status: created.status as EnrollmentStatus,
    };
  }

  async getSectionEnrollments(sectionId: string, currentUser: AuthUser): Promise<ClassEnrollmentDto[]> {
    const section = await this.prisma.classSection.findUnique({
      where: { id: sectionId },
      include: { schoolClass: true },
    });
    if (!section) throw new NotFoundException('Section not found.');
    this.resolveSchoolId(currentUser, section.schoolClass.schoolId);

    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { sectionId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentProfile: { select: { admissionNumber: true } },
          },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    return enrollments.map((e) => ({
      id: e.id,
      studentId: e.studentId,
      student: {
        id: e.student.id,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        email: e.student.email,
        admissionNumber: e.student.studentProfile?.admissionNumber || null,
      },
      sectionId: e.sectionId,
      academicYearId: e.academicYearId,
      rollNumber: e.rollNumber,
      enrolledAt: e.enrolledAt.toISOString(),
      status: e.status as EnrollmentStatus,
    }));
  }

  async removeStudentEnrollment(
    sectionId: string,
    studentId: string,
    currentUser: AuthUser,
  ): Promise<{ success: boolean; message: string }> {
    this.assertAdminAccess(currentUser);

    const section = await this.prisma.classSection.findUnique({
      where: { id: sectionId },
      include: { schoolClass: true },
    });
    if (!section) throw new NotFoundException('Section not found.');
    this.resolveSchoolId(currentUser, section.schoolClass.schoolId);

    const enrollment = await this.prisma.classEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId: section.academicYearId,
        },
      },
    });

    if (!enrollment || enrollment.sectionId !== sectionId) {
      throw new NotFoundException('Active enrollment not found for this student in this section.');
    }

    // Historical records must be preserved: mark WITHDRAWN rather than hard deleting
    await this.prisma.classEnrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.WITHDRAWN },
    });

    return { success: true, message: 'Student enrollment marked as WITHDRAWN.' };
  }

  // ---------------------------------------------------------------------------
  // TEACHER SUBJECT ASSIGNMENTS
  // ---------------------------------------------------------------------------

  async assignTeacherToSubject(
    sectionId: string,
    dto: AssignTeacherSubjectDto,
    currentUser: AuthUser,
  ): Promise<TeacherSubjectAssignmentDto> {
    this.assertAdminAccess(currentUser);

    const section = await this.prisma.classSection.findUnique({
      where: { id: sectionId },
      include: { schoolClass: true, academicYear: true },
    });
    if (!section) throw new NotFoundException('Section not found.');
    const schoolId = this.resolveSchoolId(currentUser, section.schoolClass.schoolId);

    const teacher = await this.prisma.user.findUnique({ where: { id: dto.teacherId } });
    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('Assigned user must be an active Teacher.');
    }

    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject || subject.schoolId !== schoolId) {
      throw new BadRequestException('Subject not found in this school.');
    }

    const assignment = await this.prisma.teacherSubjectAssignment.upsert({
      where: {
        teacherId_subjectId_sectionId_academicYearId: {
          teacherId: dto.teacherId,
          subjectId: dto.subjectId,
          sectionId,
          academicYearId: section.academicYearId,
        },
      },
      create: {
        teacherId: dto.teacherId,
        subjectId: dto.subjectId,
        sectionId,
        academicYearId: section.academicYearId,
      },
      update: {},
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        subject: true,
        section: { include: { schoolClass: true } },
      },
    });

    return {
      id: assignment.id,
      teacherId: assignment.teacherId,
      teacher: assignment.teacher,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
      subjectCode: assignment.subject.code,
      sectionId: assignment.sectionId,
      sectionName: assignment.section.name,
      className: assignment.section.schoolClass.name,
      academicYearId: assignment.academicYearId,
    };
  }

  async getSectionTeacherAssignments(sectionId: string, currentUser: AuthUser): Promise<TeacherSubjectAssignmentDto[]> {
    const section = await this.prisma.classSection.findUnique({
      where: { id: sectionId },
      include: { schoolClass: true },
    });
    if (!section) throw new NotFoundException('Section not found.');
    this.resolveSchoolId(currentUser, section.schoolClass.schoolId);

    const assignments = await this.prisma.teacherSubjectAssignment.findMany({
      where: { sectionId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        subject: true,
        section: { include: { schoolClass: true } },
      },
    });

    return assignments.map((a) => ({
      id: a.id,
      teacherId: a.teacherId,
      teacher: a.teacher,
      subjectId: a.subjectId,
      subjectName: a.subject.name,
      subjectCode: a.subject.code,
      sectionId: a.sectionId,
      sectionName: a.section.name,
      className: a.section.schoolClass.name,
      academicYearId: a.academicYearId,
    }));
  }

  // ---------------------------------------------------------------------------
  // TIMETABLE SCHEDULING & CONFLICT ENGINE
  // ---------------------------------------------------------------------------

  /**
   * Evaluates time range overlap: [startA, endA) and [startB, endB) overlap if startA < endB and endA > startB.
   */
  private checkTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA < endB && endA > startB;
  }

  /**
   * Conflict Detection Engine
   * Validates:
   * 1. Teacher schedule overlap
   * 2. Class section schedule overlap
   * 3. Room booking overlap
   */
  async detectTimetableConflict(
    schoolId: string,
    academicYearId: string,
    sectionId: string,
    teacherId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    roomNumber?: string | null,
    excludeEntryId?: string,
  ): Promise<TimetableConflictDto> {
    if (startTime >= endTime) {
      return {
        hasConflict: true,
        message: 'Period startTime must be before endTime.',
      };
    }

    // 1. Check Teacher Overlap
    const teacherEntries = await this.prisma.timetableEntry.findMany({
      where: {
        teacherId,
        academicYearId,
        dayOfWeek,
        id: excludeEntryId ? { not: excludeEntryId } : undefined,
      },
      include: {
        section: { include: { schoolClass: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
    });

    for (const entry of teacherEntries) {
      if (this.checkTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)) {
        return {
          hasConflict: true,
          conflictType: 'TEACHER_OVERLAP',
          message: `Teacher ${entry.teacher.firstName} ${entry.teacher.lastName} is already scheduled in ${entry.section.schoolClass.name} - ${entry.section.name} (${entry.startTime} - ${entry.endTime}) for ${entry.subject.name}.`,
          conflictingEntry: this.mapTimetableEntry(entry),
        };
      }
    }

    // 2. Check Class Section Overlap
    const sectionEntries = await this.prisma.timetableEntry.findMany({
      where: {
        sectionId,
        academicYearId,
        dayOfWeek,
        id: excludeEntryId ? { not: excludeEntryId } : undefined,
      },
      include: {
        section: { include: { schoolClass: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
    });

    for (const entry of sectionEntries) {
      if (this.checkTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)) {
        return {
          hasConflict: true,
          conflictType: 'SECTION_OVERLAP',
          message: `Section already has "${entry.subject.name}" scheduled at ${entry.startTime} - ${entry.endTime}.`,
          conflictingEntry: this.mapTimetableEntry(entry),
        };
      }
    }

    // 3. Check Room Overlap (if room is assigned)
    if (roomNumber && roomNumber.trim()) {
      const roomEntries = await this.prisma.timetableEntry.findMany({
        where: {
          schoolId,
          academicYearId,
          dayOfWeek,
          roomNumber: roomNumber.trim(),
          id: excludeEntryId ? { not: excludeEntryId } : undefined,
        },
        include: {
          section: { include: { schoolClass: true } },
          subject: true,
          teacher: true,
          academicYear: true,
        },
      });

      for (const entry of roomEntries) {
        if (this.checkTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)) {
          return {
            hasConflict: true,
            conflictType: 'ROOM_OVERLAP',
            message: `Room "${roomNumber}" is already booked by ${entry.section.schoolClass.name} - ${entry.section.name} (${entry.startTime} - ${entry.endTime}).`,
            conflictingEntry: this.mapTimetableEntry(entry),
          };
        }
      }
    }

    return { hasConflict: false };
  }

  async createTimetableEntry(
    dto: CreateTimetableEntryDto,
    currentUser: AuthUser,
  ): Promise<TimetableEntryDto> {
    this.assertAdminAccess(currentUser);

    const section = await this.prisma.classSection.findUnique({
      where: { id: dto.sectionId },
      include: { schoolClass: true },
    });
    if (!section) throw new NotFoundException('Section not found.');
    const schoolId = this.resolveSchoolId(currentUser, section.schoolClass.schoolId);

    const teacher = await this.prisma.user.findUnique({ where: { id: dto.teacherId } });
    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('Assigned teacher must be a valid Teacher account.');
    }

    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject || subject.schoolId !== schoolId) {
      throw new BadRequestException('Subject not found in this school.');
    }

    // Run Conflict Detection
    const conflict = await this.detectTimetableConflict(
      schoolId,
      dto.academicYearId,
      dto.sectionId,
      dto.teacherId,
      dto.dayOfWeek,
      dto.startTime,
      dto.endTime,
      dto.roomNumber,
    );

    if (conflict.hasConflict) {
      throw new ConflictException(conflict.message || 'Timetable scheduling conflict detected.');
    }

    const created = await this.prisma.timetableEntry.create({
      data: {
        schoolId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        academicYearId: dto.academicYearId,
        dayOfWeek: dto.dayOfWeek,
        periodName: dto.periodName.trim(),
        startTime: dto.startTime.trim(),
        endTime: dto.endTime.trim(),
        roomNumber: dto.roomNumber?.trim() || null,
      },
      include: {
        section: { include: { schoolClass: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
    });

    return this.mapTimetableEntry(created);
  }

  async updateTimetableEntry(
    id: string,
    dto: UpdateTimetableEntryDto,
    currentUser: AuthUser,
  ): Promise<TimetableEntryDto> {
    this.assertAdminAccess(currentUser);

    const existing = await this.prisma.timetableEntry.findUnique({
      where: { id },
      include: { section: { include: { schoolClass: true } } },
    });
    if (!existing) throw new NotFoundException('Timetable entry not found.');
    const schoolId = this.resolveSchoolId(currentUser, existing.schoolId);

    const targetTeacherId = dto.teacherId || existing.teacherId;
    const targetSubjectId = dto.subjectId || existing.subjectId;
    const targetDayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const targetStartTime = dto.startTime || existing.startTime;
    const targetEndTime = dto.endTime || existing.endTime;
    const targetRoom = dto.roomNumber !== undefined ? dto.roomNumber : existing.roomNumber;

    // Check conflict
    const conflict = await this.detectTimetableConflict(
      schoolId,
      existing.academicYearId,
      existing.sectionId,
      targetTeacherId,
      targetDayOfWeek,
      targetStartTime,
      targetEndTime,
      targetRoom,
      id,
    );

    if (conflict.hasConflict) {
      throw new ConflictException(conflict.message || 'Timetable scheduling conflict detected.');
    }

    const updated = await this.prisma.timetableEntry.update({
      where: { id },
      data: {
        teacherId: targetTeacherId,
        subjectId: targetSubjectId,
        dayOfWeek: targetDayOfWeek,
        periodName: dto.periodName?.trim(),
        startTime: targetStartTime,
        endTime: targetEndTime,
        roomNumber: targetRoom,
      },
      include: {
        section: { include: { schoolClass: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
    });

    return this.mapTimetableEntry(updated);
  }

  async deleteTimetableEntry(id: string, currentUser: AuthUser): Promise<{ success: boolean }> {
    this.assertAdminAccess(currentUser);

    const existing = await this.prisma.timetableEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Timetable entry not found.');
    this.resolveSchoolId(currentUser, existing.schoolId);

    await this.prisma.timetableEntry.delete({ where: { id } });
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // TIMETABLE QUERIES (SECTION, TEACHER, STUDENT, PARENT)
  // ---------------------------------------------------------------------------

  async getSectionTimetable(sectionId: string, currentUser: AuthUser): Promise<TimetableEntryDto[]> {
    const section = await this.prisma.classSection.findUnique({
      where: { id: sectionId },
      include: { schoolClass: true },
    });
    if (!section) throw new NotFoundException('Section not found.');
    this.resolveSchoolId(currentUser, section.schoolClass.schoolId);

    const entries = await this.prisma.timetableEntry.findMany({
      where: { sectionId },
      include: {
        section: { include: { schoolClass: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return entries.map((e) => this.mapTimetableEntry(e));
  }

  async getTeacherTimetable(teacherId: string, currentUser: AuthUser): Promise<TimetableEntryDto[]> {
    // Role check: Teacher can only view own timetable unless Admin
    if (currentUser.role === UserRole.TEACHER && currentUser.id !== teacherId) {
      throw new ForbiddenException('Teachers can only view their own timetable.');
    }

    const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      this.resolveSchoolId(currentUser, teacher.schoolId || undefined);
    }

    const entries = await this.prisma.timetableEntry.findMany({
      where: { teacherId },
      include: {
        section: { include: { schoolClass: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return entries.map((e) => this.mapTimetableEntry(e));
  }

  async getStudentTimetable(studentId: string, currentUser: AuthUser): Promise<TimetableEntryDto[]> {
    // Role check: Student can only view own timetable unless Admin or verified Parent
    if (currentUser.role === UserRole.STUDENT && currentUser.id !== studentId) {
      throw new ForbiddenException('Students can only view their own timetable.');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        classEnrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
          orderBy: { enrolledAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!student) throw new NotFoundException('Student not found.');

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      this.resolveSchoolId(currentUser, student.schoolId || undefined);
    }

    const activeEnrollment = student.classEnrollments[0];
    if (!activeEnrollment) {
      return []; // Clean empty state
    }

    const entries = await this.prisma.timetableEntry.findMany({
      where: { sectionId: activeEnrollment.sectionId },
      include: {
        section: { include: { schoolClass: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return entries.map((e) => this.mapTimetableEntry(e));
  }

  async getChildTimetable(childId: string, currentUser: AuthUser): Promise<TimetableEntryDto[]> {
    if (currentUser.role !== UserRole.PARENT && currentUser.role !== UserRole.PLATFORM_ADMIN && currentUser.role !== UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException('Only authorized parents and administrators can access child timetables.');
    }

    if (currentUser.role === UserRole.PARENT) {
      // Must have active VERIFIED relationship
      const rel = await this.prisma.studentGuardianRelationship.findUnique({
        where: {
          guardianId_studentId: {
            guardianId: currentUser.id,
            studentId: childId,
          },
        },
      });

      if (!rel || rel.verificationStatus !== RelationshipVerificationStatus.VERIFIED) {
        throw new ForbiddenException('Access denied. You do not possess a verified active relationship with this student.');
      }
    }

    return this.getStudentTimetable(childId, currentUser);
  }

  async getSchoolStudents(
    currentUser: AuthUser,
    query?: { search?: string; sectionId?: string; schoolId?: string },
  ) {
    const schoolId = this.resolveSchoolId(currentUser, query?.schoolId);
    const where: any = {
      schoolId,
      role: UserRole.STUDENT,
    };

    if (query?.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.sectionId) {
      where.classEnrollments = {
        some: { sectionId: query.sectionId, status: 'ACTIVE' },
      };
    }

    const students = await this.prisma.user.findMany({
      where,
      include: {
        studentProfile: true,
        classEnrollments: {
          where: { status: 'ACTIVE' },
          include: {
            section: {
              include: { schoolClass: true },
            },
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
      avatarUrl: s.avatarUrl,
      admissionNumber: s.studentProfile?.admissionNumber || null,
      gradeLevel: s.studentProfile?.gradeLevel || null,
      section: s.classEnrollments[0]?.section
        ? {
            id: s.classEnrollments[0].section.id,
            name: s.classEnrollments[0].section.name,
            className: s.classEnrollments[0].section.schoolClass.name,
          }
        : null,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  // ---------------------------------------------------------------------------
  // STUDENT ENROLLMENT & PHOTO STORAGE (TASK 018.1)
  // ---------------------------------------------------------------------------

  private async saveStudentPhoto(photoBase64: string, existingAvatarUrl?: string | null): Promise<string> {
    const matches = photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let base64Data = photoBase64;

    if (matches && matches.length === 3) {
      base64Data = matches[2];
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 2MB size limit (2 * 1024 * 1024 = 2,097,152 bytes)
    if (buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Student photo file size exceeds 2 MB limit.');
    }

    // Format & magic bytes validation (JPG, PNG, WebP)
    let ext = 'jpg';
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      ext = 'jpg';
    } else if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      ext = 'png';
    } else if (
      buffer.length >= 12 &&
      buffer.toString('utf8', 0, 4) === 'RIFF' &&
      buffer.toString('utf8', 8, 12) === 'WEBP'
    ) {
      ext = 'webp';
    } else {
      throw new BadRequestException('Unsupported image format. Allowed formats: JPG, PNG, and WebP.');
    }

    const uploadDir = path.resolve(process.cwd(), 'uploads', 'student-photos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Remove old file if it exists
    if (existingAvatarUrl && existingAvatarUrl.includes('/api/v1/classes/students/photos/')) {
      const oldFileName = path.basename(existingAvatarUrl);
      const oldPath = path.join(uploadDir, oldFileName);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {}
      }
    }

    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return `/api/v1/classes/students/photos/${fileName}`;
  }

  private removeStudentPhotoFile(avatarUrl?: string | null): void {
    if (!avatarUrl || !avatarUrl.includes('/api/v1/classes/students/photos/')) return;
    const uploadDir = path.resolve(process.cwd(), 'uploads', 'student-photos');
    const fileName = path.basename(avatarUrl);
    const filePath = path.join(uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  }

  async enrollNewStudent(dto: CreateStudentDto, currentUser: AuthUser) {
    this.assertAdminAccess(currentUser);
    const schoolId = this.resolveSchoolId(currentUser, dto.schoolId);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('A user with this email address already exists in the institutional registry.');
    }

    let avatarUrl: string | null = null;
    if (dto.photoBase64) {
      avatarUrl = await this.saveStudentPhoto(dto.photoBase64);
    }

    const defaultPassword = dto.password || 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const student = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        role: UserRole.STUDENT,
        schoolId,
        avatarUrl,
        isActive: true,
        studentProfile: {
          create: {
            admissionNumber: dto.admissionNumber?.trim() || `STU-${Date.now().toString().slice(-4)}`,
            gradeLevel: dto.gradeLevel?.trim() || null,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            gender: dto.gender?.trim() || null,
            bloodGroup: dto.bloodGroup?.trim() || null,
            emergencyContact: dto.emergencyContact?.trim() || null,
            address: dto.address?.trim() || null,
          },
        },
      },
      include: {
        studentProfile: true,
      },
    });

    if (dto.sectionId) {
      await this.enrollStudent(dto.sectionId, { studentId: student.id }, currentUser).catch((err) => {
        this.prisma.auditLog.create({
          data: {
            action: 'STUDENT_SECTION_ENROLL_WARNING',
            entityType: 'User',
            entityId: student.id,
            actorId: currentUser.id,
            details: { message: err.message },
          },
        }).catch(() => {});
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'STUDENT_ENROLLED',
        entityType: 'User',
        entityId: student.id,
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        schoolId,
        details: { email: student.email, name: `${student.firstName} ${student.lastName}` },
      },
    });

    return this.getStudentById(student.id, currentUser);
  }

  async getStudentById(studentId: string, currentUser: AuthUser) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: true,
        school: { select: { id: true, name: true, code: true } },
        classEnrollments: {
          where: { status: 'ACTIVE' },
          include: {
            section: {
              include: {
                schoolClass: true,
              },
            },
          },
        },
      },
    });

    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student record not found.');
    }

    this.resolveSchoolId(currentUser, student.schoolId || undefined);

    const activeEnrollment = student.classEnrollments[0];
    return {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      avatarUrl: student.avatarUrl,
      admissionNumber: student.studentProfile?.admissionNumber || null,
      gradeLevel: student.studentProfile?.gradeLevel || null,
      dateOfBirth: student.studentProfile?.dateOfBirth ? student.studentProfile.dateOfBirth.toISOString() : null,
      gender: student.studentProfile?.gender || null,
      bloodGroup: student.studentProfile?.bloodGroup || null,
      emergencyContact: student.studentProfile?.emergencyContact || null,
      address: student.studentProfile?.address || null,
      schoolId: student.schoolId,
      schoolName: student.school?.name || null,
      section: activeEnrollment
        ? {
            id: activeEnrollment.section.id,
            name: activeEnrollment.section.name,
            className: activeEnrollment.section.schoolClass.name,
          }
        : null,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    };
  }

  async updateStudent(studentId: string, dto: UpdateStudentDto, currentUser: AuthUser) {
    this.assertAdminAccess(currentUser);

    const existing = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { studentProfile: true },
    });
    if (!existing || existing.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student record not found.');
    }

    this.resolveSchoolId(currentUser, existing.schoolId || undefined);

    let avatarUrl = existing.avatarUrl;
    if (dto.photoBase64) {
      avatarUrl = await this.saveStudentPhoto(dto.photoBase64, existing.avatarUrl);
    } else if (dto.avatarUrl === null || dto.photoBase64 === null) {
      this.removeStudentPhotoFile(existing.avatarUrl);
      avatarUrl = null;
    }

    await this.prisma.user.update({
      where: { id: studentId },
      data: {
        firstName: dto.firstName?.trim() || undefined,
        lastName: dto.lastName?.trim() || undefined,
        phone: dto.phone?.trim() !== undefined ? dto.phone.trim() : undefined,
        avatarUrl,
      },
    });

    if (
      dto.admissionNumber ||
      dto.gradeLevel ||
      dto.dateOfBirth ||
      dto.gender ||
      dto.bloodGroup ||
      dto.emergencyContact ||
      dto.address
    ) {
      await this.prisma.studentProfile.upsert({
        where: { userId: studentId },
        update: {
          admissionNumber: dto.admissionNumber?.trim() || undefined,
          gradeLevel: dto.gradeLevel?.trim() || undefined,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender?.trim() || undefined,
          bloodGroup: dto.bloodGroup?.trim() || undefined,
          emergencyContact: dto.emergencyContact?.trim() || undefined,
          address: dto.address?.trim() || undefined,
        },
        create: {
          userId: studentId,
          admissionNumber: dto.admissionNumber?.trim() || `STU-${Date.now().toString().slice(-4)}`,
          gradeLevel: dto.gradeLevel?.trim() || null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          gender: dto.gender?.trim() || null,
          bloodGroup: dto.bloodGroup?.trim() || null,
          emergencyContact: dto.emergencyContact?.trim() || null,
          address: dto.address?.trim() || null,
        },
      });
    }

    if (dto.sectionId) {
      await this.enrollStudent(dto.sectionId, { studentId }, currentUser);
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'STUDENT_UPDATED',
        entityType: 'User',
        entityId: studentId,
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        schoolId: existing.schoolId,
        details: { updatedFields: Object.keys(dto) },
      },
    });

    return this.getStudentById(studentId, currentUser);
  }

  async uploadStudentPhoto(studentId: string, photoBase64: string, currentUser: AuthUser) {
    this.assertAdminAccess(currentUser);
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student record not found.');
    }
    this.resolveSchoolId(currentUser, student.schoolId || undefined);

    const avatarUrl = await this.saveStudentPhoto(photoBase64, student.avatarUrl);
    await this.prisma.user.update({
      where: { id: studentId },
      data: { avatarUrl },
    });
    return { success: true, avatarUrl };
  }

  async removeStudentPhoto(studentId: string, currentUser: AuthUser) {
    this.assertAdminAccess(currentUser);
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student record not found.');
    }
    this.resolveSchoolId(currentUser, student.schoolId || undefined);

    this.removeStudentPhotoFile(student.avatarUrl);
    await this.prisma.user.update({
      where: { id: studentId },
      data: { avatarUrl: null },
    });
    return { success: true, message: 'Student photo removed successfully.' };
  }

  private mapTimetableEntry(entry: any): TimetableEntryDto {
    return {
      id: entry.id,
      schoolId: entry.schoolId,
      sectionId: entry.sectionId,
      sectionName: entry.section?.name || '',
      className: entry.section?.schoolClass?.name || '',
      subjectId: entry.subjectId,
      subjectName: entry.subject?.name || '',
      subjectCode: entry.subject?.code || '',
      teacherId: entry.teacherId,
      teacherName: `${entry.teacher?.firstName || ''} ${entry.teacher?.lastName || ''}`.trim(),
      teacherEmail: entry.teacher?.email || '',
      academicYearId: entry.academicYearId,
      academicYearName: entry.academicYear?.name || '',
      dayOfWeek: entry.dayOfWeek,
      periodName: entry.periodName,
      startTime: entry.startTime,
      endTime: entry.endTime,
      roomNumber: entry.roomNumber,
      createdAt: entry.createdAt ? (entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt)) : new Date().toISOString(),
      updatedAt: entry.updatedAt ? (entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : String(entry.updatedAt)) : new Date().toISOString(),
    };
  }
}
