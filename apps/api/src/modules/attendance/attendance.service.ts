/**
 * MODULE: Attendance Management - Service
 *
 * PURPOSE:
 * Implements core attendance business logic, multi-tenant isolation,
 * atomic bulk marking, scheduling collision safety, student & class reports,
 * and cryptographically hashed NFC identity provisioning & scan simulation.
 *
 * DEPENDENCIES:
 * PrismaService, AppLogger
 *
 * SECURITY:
 * Strict school-level scoping, role-based authorization guards,
 * verified guardian parent-child boundary checks, and audit logging.
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppLogger } from '../../common/logger/app.logger';
import { NotificationType } from '@prisma/client';
import {
  AuthUser,
  UserRole,
  AttendanceStatus,
  AttendanceSessionType,
  AttendanceSessionStatus,
  NFCIdentityStatus,
  NFCEventStatus,
  AttendanceSessionDto,
  StudentAttendanceSummaryDto,
  ClassAttendanceSummaryDto,
  AttendanceReportDto,
  ProvisionNFCIdentityResponse,
  NFCScanResultDto,
  NFCAttendanceEventDto,
} from '@ems/contracts';
import {
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
  BulkMarkAttendanceDto,
  AttendanceReportFilterDto,
  ProvisionNFCIdentityDto,
  NFCScanDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new AppLogger();

  constructor(private readonly prisma: PrismaService) {
    this.logger.setContext('AttendanceService');
  }

  // ===========================================================================
  // ATTENDANCE SESSIONS
  // ===========================================================================

  async createSession(
    dto: CreateAttendanceSessionDto,
    currentUser: AuthUser,
  ): Promise<AttendanceSessionDto> {
    const section = await this.prisma.classSection.findUnique({
      where: { id: dto.classSectionId },
      include: {
        schoolClass: { include: { school: true } },
        academicYear: true,
        classTeacher: true,
      },
    });

    if (!section) {
      throw new NotFoundException(`Class section '${dto.classSectionId}' not found.`);
    }

    const schoolId = section.schoolClass.schoolId;

    // RBAC & School Isolation
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId !== schoolId
    ) {
      throw new ForbiddenException('Cannot manage attendance for an unauthorized school.');
    }

    // Teacher Scoping: Must be assigned to this section
    if (currentUser.role === UserRole.TEACHER) {
      const isAssigned = await this.isTeacherAssignedToSection(
        currentUser.id,
        section.id,
      );
      if (!isAssigned) {
        throw new ForbiddenException(
          'Teachers can only initialize attendance for class sections they are assigned to.',
        );
      }
    }

    // Role Guard: Students & Parents cannot create attendance sessions
    if (currentUser.role === UserRole.STUDENT || currentUser.role === UserRole.PARENT) {
      throw new ForbiddenException('Students and parents are not permitted to create attendance sessions.');
    }

    const sessionType = dto.sessionType || AttendanceSessionType.DAILY;
    const dateObj = new Date(dto.attendanceDate);

    // Normalize date for comparison (start of day UTC)
    const startOfDay = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 23, 59, 59, 999));

    // WHY: Prevent duplicate daily sessions for the same class on the same date.
    if (sessionType === AttendanceSessionType.DAILY) {
      const existingDaily = await this.prisma.attendanceSession.findFirst({
        where: {
          classSectionId: section.id,
          sessionType: AttendanceSessionType.DAILY,
          attendanceDate: { gte: startOfDay, lte: endOfDay },
        },
      });
      if (existingDaily) {
        throw new ConflictException(
          `A daily attendance session already exists for ${section.schoolClass.name} - ${section.name} on ${dto.attendanceDate}.`,
        );
      }
    } else if (sessionType === AttendanceSessionType.PERIOD && dto.timetableEntryId) {
      const existingPeriod = await this.prisma.attendanceSession.findFirst({
        where: {
          classSectionId: section.id,
          sessionType: AttendanceSessionType.PERIOD,
          timetableEntryId: dto.timetableEntryId,
          attendanceDate: { gte: startOfDay, lte: endOfDay },
        },
      });
      if (existingPeriod) {
        throw new ConflictException(
          `An attendance session for this period timetable slot already exists on ${dto.attendanceDate}.`,
        );
      }
    }

    // Create session and auto-generate draft records for all active enrolled students
    const created = await this.prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.create({
        data: {
          schoolId,
          academicYearId: section.academicYearId,
          classSectionId: section.id,
          attendanceDate: startOfDay,
          sessionType,
          timetableEntryId: dto.timetableEntryId || null,
          createdById: currentUser.id,
          status: AttendanceSessionStatus.DRAFT,
        },
        include: {
          school: true,
          academicYear: true,
          classSection: { include: { schoolClass: true } },
          createdBy: true,
          timetableEntry: { include: { subject: true } },
        },
      });

      // Pre-fill active roster records
      const enrollments = await tx.classEnrollment.findMany({
        where: {
          sectionId: section.id,
          status: 'ACTIVE',
        },
      });

      if (enrollments.length > 0) {
        await tx.attendanceRecord.createMany({
          data: enrollments.map((enr) => ({
            attendanceSessionId: session.id,
            studentId: enr.studentId,
            status: AttendanceStatus.PRESENT,
            markedById: currentUser.id,
          })),
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'ATTENDANCE_SESSION_CREATED',
          entityType: 'AttendanceSession',
          entityId: session.id,
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          schoolId,
          details: {
            classSectionId: section.id,
            attendanceDate: dto.attendanceDate,
            sessionType,
            enrolledCount: enrollments.length,
          },
        },
      });

      return session;
    });

    return this.getSessionById(created.id, currentUser);
  }

  async getSessions(
    currentUser: AuthUser,
    filters?: {
      schoolId?: string;
      classSectionId?: string;
      date?: string;
      status?: AttendanceSessionStatus;
    },
  ): Promise<AttendanceSessionDto[]> {
    const where: any = {};

    // Multi-tenant isolation
    if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      if (filters?.schoolId) where.schoolId = filters.schoolId;
    } else {
      where.schoolId = currentUser.schoolId;
    }

    if (filters?.classSectionId) {
      where.classSectionId = filters.classSectionId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.date) {
      const d = new Date(filters.date);
      where.attendanceDate = {
        gte: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0)),
        lte: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)),
      };
    }

    // Teacher filtering: only view classes they are assigned to
    if (currentUser.role === UserRole.TEACHER) {
      const assignedSections = await this.getTeacherAssignedSectionIds(currentUser.id);
      where.classSectionId = { in: assignedSections };
    }

    const sessions = await this.prisma.attendanceSession.findMany({
      where,
      include: {
        school: true,
        academicYear: true,
        classSection: { include: { schoolClass: true } },
        createdBy: true,
        finalizedBy: true,
        timetableEntry: { include: { subject: true } },
        records: true,
      },
      orderBy: { attendanceDate: 'desc' },
    });

    return sessions.map((s) => this.mapToSessionDto(s));
  }

  async getSessionById(id: string, currentUser: AuthUser): Promise<AttendanceSessionDto> {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        school: true,
        academicYear: true,
        classSection: { include: { schoolClass: true } },
        createdBy: true,
        finalizedBy: true,
        timetableEntry: { include: { subject: true } },
        records: {
          include: {
            student: {
              include: {
                studentProfile: true,
                classEnrollments: {
                  where: { status: 'ACTIVE' },
                },
              },
            },
            markedBy: true,
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Attendance session '${id}' not found.`);
    }

    // School Isolation
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      session.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cannot view attendance session for an unauthorized school.');
    }

    // Teacher Scoping
    if (currentUser.role === UserRole.TEACHER) {
      const isAssigned = await this.isTeacherAssignedToSection(
        currentUser.id,
        session.classSectionId,
      );
      if (!isAssigned) {
        throw new ForbiddenException('Teachers can only access attendance sessions for their assigned classes.');
      }
    }

    return this.mapToSessionDto(session);
  }

  async updateSession(
    id: string,
    dto: UpdateAttendanceSessionDto,
    currentUser: AuthUser,
  ): Promise<AttendanceSessionDto> {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Attendance session '${id}' not found.`);
    }

    // School Isolation
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      session.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cannot update attendance session for an unauthorized school.');
    }

    // Finalized check
    if (session.status === AttendanceSessionStatus.FINALIZED) {
      throw new BadRequestException('Cannot modify details of a finalized attendance session.');
    }

    const data: any = {};
    if (dto.attendanceDate) {
      data.attendanceDate = new Date(dto.attendanceDate);
    }
    if (dto.timetableEntryId !== undefined) {
      data.timetableEntryId = dto.timetableEntryId;
    }

    await this.prisma.attendanceSession.update({
      where: { id },
      data,
    });

    return this.getSessionById(id, currentUser);
  }

  async finalizeSession(id: string, currentUser: AuthUser): Promise<AttendanceSessionDto> {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Attendance session '${id}' not found.`);
    }

    // Authorization
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      session.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cannot finalize session for an unauthorized school.');
    }

    if (currentUser.role === UserRole.TEACHER) {
      const isAssigned = await this.isTeacherAssignedToSection(
        currentUser.id,
        session.classSectionId,
      );
      if (!isAssigned) {
        throw new ForbiddenException('Teachers can only finalize sessions for their assigned classes.');
      }
    }

    if (session.status === AttendanceSessionStatus.FINALIZED) {
      return this.getSessionById(id, currentUser);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.attendanceSession.update({
        where: { id },
        data: {
          status: AttendanceSessionStatus.FINALIZED,
          finalizedAt: new Date(),
          finalizedById: currentUser.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ATTENDANCE_SESSION_FINALIZED',
          entityType: 'AttendanceSession',
          entityId: id,
          actorId: currentUser.id,
          actorEmail: currentUser.email,
          schoolId: session.schoolId,
          details: { finalizedAt: new Date().toISOString() },
        },
      });

      // TASK 030: Dispatch automated absence notifications to verified guardians
      await this.dispatchAutomatedAbsenceAlerts(session, tx);
    });

    return this.getSessionById(id, currentUser);
  }

  // ===========================================================================
  // ATTENDANCE RECORDS (BULK MARKING & ATOMIC UPDATES)
  // ===========================================================================

  async bulkMarkRecords(
    sessionId: string,
    dto: BulkMarkAttendanceDto,
    currentUser: AuthUser,
  ): Promise<AttendanceSessionDto> {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Attendance session '${sessionId}' not found.`);
    }

    // School Isolation
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      session.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cannot modify attendance for an unauthorized school.');
    }

    // Role check: Only Teachers and Admins can mark attendance
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.role !== UserRole.SCHOOL_ADMIN &&
      currentUser.role !== UserRole.TEACHER
    ) {
      throw new ForbiddenException('Only educators and administrators can record attendance.');
    }

    // Teacher class assignment verification
    if (currentUser.role === UserRole.TEACHER) {
      const isAssigned = await this.isTeacherAssignedToSection(
        currentUser.id,
        session.classSectionId,
      );
      if (!isAssigned) {
        throw new ForbiddenException('Teachers can only record attendance for classes they are assigned to.');
      }
    }

    // Finalized session correction rules
    const isCorrection = session.status === AttendanceSessionStatus.FINALIZED;
    if (isCorrection) {
      // Ordinary teachers cannot edit finalized registers
      if (currentUser.role === UserRole.TEACHER) {
        throw new ForbiddenException(
          'This attendance register has been finalized. Corrections require School Administrator authorization.',
        );
      }
    }

    // Reject duplicate student IDs in a single bulk request
    const studentIds = dto.records.map((r) => r.studentId);
    if (new Set(studentIds).size !== studentIds.length) {
      throw new BadRequestException('Bulk attendance request contains duplicate student entries.');
    }

    // Verify all students are actively enrolled in this class section
    const validEnrollments = await this.prisma.classEnrollment.findMany({
      where: {
        sectionId: session.classSectionId,
        studentId: { in: studentIds },
        status: 'ACTIVE',
      },
      select: { studentId: true },
    });

    const validStudentIdSet = new Set(validEnrollments.map((e) => e.studentId));
    for (const studentId of studentIds) {
      if (!validStudentIdSet.has(studentId)) {
        throw new BadRequestException(
          `Student '${studentId}' is not currently enrolled in this class section roster.`,
        );
      }
    }

    // Capture previous records if this is a correction on a finalized register
    const existingRecords = isCorrection
      ? await this.prisma.attendanceRecord.findMany({
          where: {
            attendanceSessionId: sessionId,
            studentId: { in: studentIds },
          },
          select: { studentId: true, status: true },
        })
      : [];
    const oldStatusMap = new Map((existingRecords || []).map((r) => [r.studentId, r.status]));

    // Atomic transaction for bulk upsert
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.records) {
        await tx.attendanceRecord.upsert({
          where: {
            attendanceSessionId_studentId: {
              attendanceSessionId: sessionId,
              studentId: item.studentId,
            },
          },
          update: {
            status: item.status,
            remarks: item.remarks || null,
            markedById: currentUser.id,
            updatedAt: new Date(),
          },
          create: {
            attendanceSessionId: sessionId,
            studentId: item.studentId,
            status: item.status,
            remarks: item.remarks || null,
            markedById: currentUser.id,
          },
        });
      }

      // Log correction audit if modified after finalization
      if (isCorrection) {
        await tx.auditLog.create({
          data: {
            action: 'ATTENDANCE_CORRECTION_APPLIED',
            entityType: 'AttendanceSession',
            entityId: sessionId,
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            schoolId: session.schoolId,
            details: {
              correctionCount: dto.records.length,
              correctedByRole: currentUser.role,
            },
          },
        });

        // TASK 030: Dispatch attendance correction notifications for status changes
        const corrections: { studentId: string; oldStatus: string; newStatus: string }[] = [];
        for (const item of dto.records) {
          const oldStatus = oldStatusMap.get(item.studentId);
          if (oldStatus && oldStatus !== item.status) {
            corrections.push({ studentId: item.studentId, oldStatus, newStatus: item.status });
          }
        }
        if (corrections.length > 0) {
          await this.dispatchAttendanceCorrectionAlerts(session, corrections, tx);
        }
      }
    });

    return this.getSessionById(sessionId, currentUser);
  }

  // ===========================================================================
  // STUDENT & CLASS ATTENDANCE HISTORIES & REPORTS
  // ===========================================================================

  async getStudentAttendance(
    studentId: string,
    currentUser: AuthUser,
  ): Promise<StudentAttendanceSummaryDto> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: true,
        classEnrollments: {
          where: { status: 'ACTIVE' },
          include: { section: { include: { schoolClass: true } } },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student '${studentId}' not found.`);
    }

    // Role-based Access Control
    if (currentUser.role === UserRole.STUDENT) {
      if (currentUser.id !== studentId) {
        throw new ForbiddenException('Students can only inspect their own attendance history.');
      }
    } else if (currentUser.role === UserRole.PARENT) {
      // Guardian boundary check: MUST have active verified relationship
      const verifiedRel = await this.prisma.studentGuardianRelationship.findFirst({
        where: {
          guardianId: currentUser.id,
          studentId,
          verificationStatus: 'VERIFIED',
        },
      });
      if (!verifiedRel) {
        throw new ForbiddenException('Access denied. No active verified guardian relationship with this student.');
      }
    } else if (currentUser.role === UserRole.SCHOOL_ADMIN || currentUser.role === UserRole.TEACHER) {
      if (student.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('Cannot access student attendance records outside your authorized school.');
      }
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId },
      include: {
        attendanceSession: {
          include: {
            classSection: { include: { schoolClass: true } },
            timetableEntry: { include: { subject: true } },
          },
        },
      },
      orderBy: { attendanceSession: { attendanceDate: 'desc' } },
    });

    const totalSessions = records.length;
    const presentSessions = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absentSessions = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const lateSessions = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const excusedSessions = records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;

    // ATTENDANCE CALCULATION POLICY: Physical presence = (present + late) / total
    const attendancePercentage =
      totalSessions > 0
        ? Math.round(((presentSessions + lateSessions) / totalSessions) * 100)
        : 100;

    const currentEnrollment = student.classEnrollments[0];

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      studentEmail: student.email,
      className: currentEnrollment?.section?.schoolClass?.name || 'Unassigned',
      sectionName: currentEnrollment?.section?.name || 'Unassigned',
      totalSessions,
      presentSessions,
      absentSessions,
      lateSessions,
      excusedSessions,
      attendancePercentage,
      records: records.map((r) => ({
        id: r.id,
        sessionId: r.attendanceSessionId,
        date: r.attendanceSession.attendanceDate.toISOString().split('T')[0],
        sessionType: r.attendanceSession.sessionType as AttendanceSessionType,
        periodName: r.attendanceSession.timetableEntry?.periodName || null,
        subjectName: r.attendanceSession.timetableEntry?.subject?.name || null,
        status: r.status as AttendanceStatus,
        remarks: r.remarks,
      })),
    };
  }

  async getClassAttendance(
    classSectionId: string,
    currentUser: AuthUser,
  ): Promise<ClassAttendanceSummaryDto> {
    const section = await this.prisma.classSection.findUnique({
      where: { id: classSectionId },
      include: {
        schoolClass: true,
        enrollments: { where: { status: 'ACTIVE' } },
      },
    });

    if (!section) {
      throw new NotFoundException(`Class section '${classSectionId}' not found.`);
    }

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      section.schoolClass.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cannot access class attendance outside your authorized school.');
    }

    const sessions = await this.prisma.attendanceSession.findMany({
      where: { classSectionId },
      include: {
        school: true,
        academicYear: true,
        classSection: { include: { schoolClass: true } },
        createdBy: true,
        finalizedBy: true,
        timetableEntry: { include: { subject: true } },
        records: true,
      },
      orderBy: { attendanceDate: 'desc' },
    });

    const sessionDtos = sessions.map((s) => this.mapToSessionDto(s));
    const avgPercentage =
      sessionDtos.length > 0
        ? Math.round(
            sessionDtos.reduce((acc, s) => acc + s.attendancePercentage, 0) /
              sessionDtos.length,
          )
        : 100;

    return {
      classSectionId: section.id,
      sectionName: section.name,
      className: section.schoolClass.name,
      totalStudents: section.enrollments.length,
      totalSessions: sessionDtos.length,
      averageAttendancePercentage: avgPercentage,
      sessions: sessionDtos,
    };
  }

  async getAttendanceReports(
    currentUser: AuthUser,
    filters?: AttendanceReportFilterDto,
  ): Promise<AttendanceReportDto> {
    const where: any = {};

    if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      if (filters?.schoolId) where.schoolId = filters.schoolId;
    } else {
      where.schoolId = currentUser.schoolId;
    }

    if (filters?.classSectionId) {
      where.classSectionId = filters.classSectionId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.attendanceDate = {};
      if (filters.startDate) where.attendanceDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.attendanceDate.lte = new Date(filters.endDate);
    }

    const sessions = await this.prisma.attendanceSession.findMany({
      where,
      include: {
        records: {
          include: { student: true },
        },
      },
      orderBy: { attendanceDate: 'asc' },
    });

    let totalSessions = sessions.length;
    let totalRecords = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    const dateMap = new Map<string, { total: number; present: number; absent: number; late: number; excused: number }>();
    const studentMap = new Map<string, { name: string; total: number; present: number; absent: number; late: number; excused: number }>();

    for (const s of sessions) {
      const dateKey = s.attendanceDate.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { total: 0, present: 0, absent: 0, late: 0, excused: 0 });
      }
      const dateStats = dateMap.get(dateKey)!;

      for (const r of s.records) {
        totalRecords++;
        dateStats.total++;

        if (!studentMap.has(r.studentId)) {
          studentMap.set(r.studentId, {
            name: `${r.student.firstName} ${r.student.lastName}`,
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
          });
        }
        const studentStats = studentMap.get(r.studentId)!;
        studentStats.total++;

        if (r.status === AttendanceStatus.PRESENT) {
          presentCount++;
          dateStats.present++;
          studentStats.present++;
        } else if (r.status === AttendanceStatus.ABSENT) {
          absentCount++;
          dateStats.absent++;
          studentStats.absent++;
        } else if (r.status === AttendanceStatus.LATE) {
          lateCount++;
          dateStats.late++;
          studentStats.late++;
        } else if (r.status === AttendanceStatus.EXCUSED) {
          excusedCount++;
          dateStats.excused++;
          studentStats.excused++;
        }
      }
    }

    const overallPercentage =
      totalRecords > 0
        ? Math.round(((presentCount + lateCount) / totalRecords) * 100)
        : 100;

    const byDate = Array.from(dateMap.entries()).map(([date, st]) => ({
      date,
      total: st.total,
      present: st.present,
      absent: st.absent,
      late: st.late,
      excused: st.excused,
      percentage: st.total > 0 ? Math.round(((st.present + st.late) / st.total) * 100) : 100,
    }));

    const byStudent = Array.from(studentMap.entries()).map(([studentId, st]) => ({
      studentId,
      studentName: st.name,
      total: st.total,
      present: st.present,
      absent: st.absent,
      late: st.late,
      excused: st.excused,
      percentage: st.total > 0 ? Math.round(((st.present + st.late) / st.total) * 100) : 100,
    }));

    return {
      totalSessions,
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      overallAttendancePercentage: overallPercentage,
      byDate,
      byStudent,
    };
  }

  // ===========================================================================
  // NFC IDENTITY PROVISIONING & SCAN SIMULATION
  // ===========================================================================

  async provisionNFCIdentity(
    dto: ProvisionNFCIdentityDto,
    currentUser: AuthUser,
  ): Promise<ProvisionNFCIdentityResponse> {
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.role !== UserRole.SCHOOL_ADMIN
    ) {
      throw new ForbiddenException('Only institutional administrators can provision NFC identities.');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });

    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException(`Student '${dto.studentId}' not found.`);
    }

    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      student.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cannot provision NFC identity for another school.');
    }

    // Hash token cryptographically with SHA-256
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.cardToken.trim())
      .digest('hex');

    const schoolId = student.schoolId!;

    const identity = await this.prisma.nFCIdentity.upsert({
      where: { studentId: student.id },
      update: {
        simulatedCardTokenHash: tokenHash,
        status: NFCIdentityStatus.ACTIVE,
        schoolId,
        updatedAt: new Date(),
      },
      create: {
        schoolId,
        studentId: student.id,
        simulatedCardTokenHash: tokenHash,
        status: NFCIdentityStatus.ACTIVE,
      },
      include: { student: true },
    });

    const maskedToken =
      dto.cardToken.length > 4
        ? '••••-••••-' + dto.cardToken.slice(-4)
        : '••••-••••';

    return {
      identity: {
        id: identity.id,
        schoolId: identity.schoolId,
        studentId: identity.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.email,
        status: identity.status as NFCIdentityStatus,
        createdAt: identity.createdAt.toISOString(),
        updatedAt: identity.updatedAt.toISOString(),
      },
      maskedToken,
      message: 'Simulated NFC Card provisioned successfully.',
    };
  }

  async scanNFC(dto: NFCScanDto, currentUser: AuthUser): Promise<NFCScanResultDto> {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: dto.attendanceSessionId },
      include: { school: true, classSection: true },
    });

    if (!session) {
      throw new NotFoundException(`Attendance session '${dto.attendanceSessionId}' not found.`);
    }

    // Authorization: User operating scanner must be admin or assigned teacher
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      session.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cannot operate NFC attendance scanner for another school.');
    }

    if (currentUser.role === UserRole.TEACHER) {
      const isAssigned = await this.isTeacherAssignedToSection(
        currentUser.id,
        session.classSectionId,
      );
      if (!isAssigned) {
        throw new ForbiddenException('Educator not assigned to this class section.');
      }
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.cardToken.trim())
      .digest('hex');

    const identity = await this.prisma.nFCIdentity.findUnique({
      where: { simulatedCardTokenHash: tokenHash },
      include: { student: true },
    });

    // Case 1: Unknown card token
    if (!identity) {
      await this.prisma.nFCAttendanceEvent.create({
        data: {
          schoolId: session.schoolId,
          attendanceSessionId: session.id,
          eventStatus: NFCEventStatus.REJECTED,
          rejectionReason: 'Unknown or unassigned card token hash.',
        },
      });
      throw new BadRequestException('NFC scan rejected: Unrecognized or unregistered card.');
    }

    // Case 2: Disabled card identity
    if (identity.status === NFCIdentityStatus.DISABLED) {
      await this.prisma.nFCAttendanceEvent.create({
        data: {
          schoolId: session.schoolId,
          attendanceSessionId: session.id,
          studentId: identity.studentId,
          eventStatus: NFCEventStatus.REJECTED,
          rejectionReason: 'NFC card identity has been deactivated.',
        },
      });
      throw new BadRequestException('NFC scan rejected: Card identity is deactivated.');
    }

    // Case 3: Cross-school identity mismatch
    if (identity.schoolId !== session.schoolId) {
      await this.prisma.nFCAttendanceEvent.create({
        data: {
          schoolId: session.schoolId,
          attendanceSessionId: session.id,
          studentId: identity.studentId,
          eventStatus: NFCEventStatus.REJECTED,
          rejectionReason: 'Cross-school identity mismatch.',
        },
      });
      throw new ForbiddenException('NFC scan rejected: Card belongs to another institution.');
    }

    // Case 4: Verify student is actively enrolled in this class section
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: {
        sectionId: session.classSectionId,
        studentId: identity.studentId,
        status: 'ACTIVE',
      },
    });

    if (!enrollment) {
      await this.prisma.nFCAttendanceEvent.create({
        data: {
          schoolId: session.schoolId,
          attendanceSessionId: session.id,
          studentId: identity.studentId,
          eventStatus: NFCEventStatus.REJECTED,
          rejectionReason: 'Student is not enrolled in this class section.',
        },
      });
      throw new BadRequestException(
        `NFC scan rejected: Student ${identity.student.firstName} ${identity.student.lastName} is not enrolled in this class section.`,
      );
    }

    // Case 5: Duplicate scan detection
    const existingRecord = await this.prisma.attendanceRecord.findUnique({
      where: {
        attendanceSessionId_studentId: {
          attendanceSessionId: session.id,
          studentId: identity.studentId,
        },
      },
    });

    if (existingRecord && (existingRecord.status === AttendanceStatus.PRESENT || existingRecord.status === AttendanceStatus.LATE)) {
      await this.prisma.nFCAttendanceEvent.create({
        data: {
          schoolId: session.schoolId,
          attendanceSessionId: session.id,
          studentId: identity.studentId,
          eventStatus: NFCEventStatus.DUPLICATE,
          rejectionReason: 'Attendance has already been recorded for this student.',
        },
      });
      return {
        eventStatus: NFCEventStatus.DUPLICATE,
        studentId: identity.studentId,
        studentName: `${identity.student.firstName} ${identity.student.lastName}`,
        markedStatus: existingRecord.status as AttendanceStatus,
        message: `Duplicate scan ignored: ${identity.student.firstName} ${identity.student.lastName} is already recorded as ${existingRecord.status}.`,
      };
    }

    // Case 6: Successful scan -> Mark PRESENT
    await this.prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.upsert({
        where: {
          attendanceSessionId_studentId: {
            attendanceSessionId: session.id,
            studentId: identity.studentId,
          },
        },
        update: {
          status: AttendanceStatus.PRESENT,
          remarks: 'Marked via NFC gate terminal.',
          markedById: currentUser.id,
          updatedAt: new Date(),
        },
        create: {
          attendanceSessionId: session.id,
          studentId: identity.studentId,
          status: AttendanceStatus.PRESENT,
          remarks: 'Marked via NFC gate terminal.',
          markedById: currentUser.id,
        },
      });

      await tx.nFCAttendanceEvent.create({
        data: {
          schoolId: session.schoolId,
          attendanceSessionId: session.id,
          studentId: identity.studentId,
          eventStatus: NFCEventStatus.ACCEPTED,
        },
      });
    });

    return {
      eventStatus: NFCEventStatus.ACCEPTED,
      studentId: identity.studentId,
      studentName: `${identity.student.firstName} ${identity.student.lastName}`,
      markedStatus: AttendanceStatus.PRESENT,
      message: `Verified: ${identity.student.firstName} ${identity.student.lastName} marked PRESENT.`,
    };
  }

  async getNFCEvents(currentUser: AuthUser, sessionId?: string): Promise<NFCAttendanceEventDto[]> {
    const where: any = {};
    if (currentUser.role !== UserRole.PLATFORM_ADMIN) {
      where.schoolId = currentUser.schoolId;
    }
    if (sessionId) {
      where.attendanceSessionId = sessionId;
    }

    const events = await this.prisma.nFCAttendanceEvent.findMany({
      where,
      include: { student: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return events.map((e) => ({
      id: e.id,
      schoolId: e.schoolId,
      attendanceSessionId: e.attendanceSessionId,
      studentId: e.studentId,
      studentName: e.student ? `${e.student.firstName} ${e.student.lastName}` : null,
      eventType: e.eventType,
      eventStatus: e.eventStatus as NFCEventStatus,
      rejectionReason: e.rejectionReason,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  // ===========================================================================
  // PRIVATE HELPERS & MAPPERS
  // ===========================================================================

  private async isTeacherAssignedToSection(
    teacherId: string,
    sectionId: string,
  ): Promise<boolean> {
    const section = await this.prisma.classSection.findUnique({
      where: { id: sectionId },
      include: {
        teacherSubjectAssignments: { where: { teacherId } },
      },
    });

    if (!section) return false;
    if (section.classTeacherId === teacherId) return true;
    if (section.teacherSubjectAssignments.length > 0) return true;

    const timetableEntry = await this.prisma.timetableEntry.findFirst({
      where: { sectionId, teacherId },
    });

    return !!timetableEntry;
  }

  private async getTeacherAssignedSectionIds(teacherId: string): Promise<string[]> {
    const classTeacherSections = await this.prisma.classSection.findMany({
      where: { classTeacherId: teacherId },
      select: { id: true },
    });

    const subjectAssignments = await this.prisma.teacherSubjectAssignment.findMany({
      where: { teacherId },
      select: { sectionId: true },
    });

    const timetableSections = await this.prisma.timetableEntry.findMany({
      where: { teacherId },
      select: { sectionId: true },
    });

    const allIds = new Set([
      ...classTeacherSections.map((s) => s.id),
      ...subjectAssignments.map((s) => s.sectionId),
      ...timetableSections.map((s) => s.sectionId),
    ]);

    return Array.from(allIds);
  }

  private mapToSessionDto(session: any): AttendanceSessionDto {
    const records = session.records || [];
    const presentCount = records.filter((r: any) => r.status === AttendanceStatus.PRESENT).length;
    const absentCount = records.filter((r: any) => r.status === AttendanceStatus.ABSENT).length;
    const lateCount = records.filter((r: any) => r.status === AttendanceStatus.LATE).length;
    const excusedCount = records.filter((r: any) => r.status === AttendanceStatus.EXCUSED).length;
    const recordsCount = records.length;

    const attendancePercentage =
      recordsCount > 0
        ? Math.round(((presentCount + lateCount) / recordsCount) * 100)
        : 100;

    return {
      id: session.id,
      schoolId: session.schoolId,
      schoolName: session.school?.name || '',
      academicYearId: session.academicYearId,
      academicYearName: session.academicYear?.name || '',
      classSectionId: session.classSectionId,
      sectionName: session.classSection?.name || '',
      className: session.classSection?.schoolClass?.name || '',
      attendanceDate: session.attendanceDate instanceof Date
        ? session.attendanceDate.toISOString().split('T')[0]
        : String(session.attendanceDate).split('T')[0],
      sessionType: session.sessionType as AttendanceSessionType,
      timetableEntryId: session.timetableEntryId,
      periodName: session.timetableEntry?.periodName || null,
      subjectName: session.timetableEntry?.subject?.name || null,
      status: session.status as AttendanceSessionStatus,
      createdById: session.createdById,
      createdByName: session.createdBy
        ? `${session.createdBy.firstName} ${session.createdBy.lastName}`
        : '',
      finalizedAt: session.finalizedAt ? session.finalizedAt.toISOString() : null,
      finalizedById: session.finalizedById,
      finalizedByName: session.finalizedBy
        ? `${session.finalizedBy.firstName} ${session.finalizedBy.lastName}`
        : null,
      recordsCount,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendancePercentage,
      records: records.map((r: any) => ({
        id: r.id,
        attendanceSessionId: r.attendanceSessionId,
        studentId: r.studentId,
        studentName: r.student
          ? `${r.student.firstName} ${r.student.lastName}`
          : '',
        studentEmail: r.student?.email || '',
        admissionNumber: r.student?.studentProfile?.admissionNumber || null,
        rollNumber: r.student?.classEnrollments?.[0]?.rollNumber || null,
        status: r.status as AttendanceStatus,
        remarks: r.remarks,
        markedById: r.markedById,
        markedByName: r.markedBy
          ? `${r.markedBy.firstName} ${r.markedBy.lastName}`
          : '',
        markedAt: r.markedAt instanceof Date ? r.markedAt.toISOString() : String(r.markedAt),
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
      })),
      createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : String(session.createdAt),
      updatedAt: session.updatedAt instanceof Date ? session.updatedAt.toISOString() : String(session.updatedAt),
    };
  }

  // ===========================================================================
  // TASK 030: AUTOMATED ABSENCE & CORRECTION NOTIFICATIONS
  // ===========================================================================

  private async dispatchAutomatedAbsenceAlerts(
    session: { id: string; schoolId: string; attendanceDate: Date },
    txOrPrisma: any,
  ) {
    // 1. Check if absence alerts are enabled for this school
    const pref = await txOrPrisma.notificationPreference.findUnique({
      where: { schoolId: session.schoolId },
    });
    if (pref && pref.absenceAlertsEnabled === false) {
      return;
    }

    // 2. Fetch school name
    const school = await txOrPrisma.school.findUnique({
      where: { id: session.schoolId },
      select: { name: true },
    });
    const schoolName = school?.name || 'School Administration';

    // 3. Find all absent records in this session
    const absentRecords = await txOrPrisma.attendanceRecord.findMany({
      where: {
        attendanceSessionId: session.id,
        status: AttendanceStatus.ABSENT,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (absentRecords.length === 0) return;

    const dateStr = new Date(session.attendanceDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    for (const record of absentRecords) {
      const studentName = `${record.student.firstName} ${record.student.lastName}`;

      // 4. Resolve verified active guardians
      const relationships = await txOrPrisma.studentGuardianRelationship.findMany({
        where: {
          studentId: record.student.id,
          verificationStatus: 'VERIFIED',
        },
        include: { guardian: true },
      });

      for (const rel of relationships) {
        const guardian = rel.guardian;
        if (!guardian || !guardian.isActive) continue;

        // 5. Deduplication check: check if absence alert already sent for this student, guardian, session
        const existingNotifications = await txOrPrisma.notification.findMany({
          where: {
            userId: guardian.id,
            type: NotificationType.ATTENDANCE,
          },
          select: { metadata: true },
        });

        const isDuplicate = existingNotifications.some(
          (n: any) =>
            n.metadata &&
            n.metadata.attendanceSessionId === session.id &&
            n.metadata.studentId === record.student.id &&
            n.metadata.alertType === 'ABSENCE',
        );

        if (isDuplicate) {
          continue; // Prevent duplicate alert
        }

        const messageBody = `Dear Parent/Guardian,\n\nYour child, ${studentName}, has been marked absent from ${schoolName} on ${dateStr}.\n\nIf you believe this record is incorrect, please contact the school administration.\n\nRegards,\nSchool Administration`;

        await txOrPrisma.notification.create({
          data: {
            userId: guardian.id,
            schoolId: session.schoolId,
            title: 'Student Absence Alert',
            message: messageBody,
            type: NotificationType.ATTENDANCE,
            link: '/parent',
            read: false,
            metadata: {
              studentId: record.student.id,
              studentName,
              attendanceSessionId: session.id,
              attendanceDate: new Date(session.attendanceDate).toISOString(),
              alertType: 'ABSENCE',
            },
          },
        });
      }
    }
  }

  private async dispatchAttendanceCorrectionAlerts(
    session: { id: string; schoolId: string; attendanceDate: Date },
    corrections: { studentId: string; oldStatus: string; newStatus: string }[],
    txOrPrisma: any,
  ) {
    const pref = await txOrPrisma.notificationPreference.findUnique({
      where: { schoolId: session.schoolId },
    });
    if (pref && pref.attendanceCorrectionAlertsEnabled === false) {
      return;
    }

    const school = await txOrPrisma.school.findUnique({
      where: { id: session.schoolId },
      select: { name: true },
    });
    const schoolName = school?.name || 'School Administration';

    const dateStr = new Date(session.attendanceDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    for (const corr of corrections) {
      // If student was ABSENT and is now corrected to PRESENT, LATE, or EXCUSED
      if (corr.oldStatus === 'ABSENT' && corr.newStatus !== 'ABSENT') {
        const student = await txOrPrisma.user.findUnique({
          where: { id: corr.studentId },
          select: { firstName: true, lastName: true },
        });
        const studentName = student ? `${student.firstName} ${student.lastName}` : 'Student';

        const relationships = await txOrPrisma.studentGuardianRelationship.findMany({
          where: {
            studentId: corr.studentId,
            verificationStatus: 'VERIFIED',
          },
          include: { guardian: true },
        });

        for (const rel of relationships) {
          const guardian = rel.guardian;
          if (!guardian || !guardian.isActive) continue;

          const messageBody = `Dear Parent/Guardian,\n\nThe attendance record for your child, ${studentName}, on ${dateStr} has been updated from ABSENT to ${corr.newStatus}.\n\nRegards,\n${schoolName}`;

          await txOrPrisma.notification.create({
            data: {
              userId: guardian.id,
              schoolId: session.schoolId,
              title: 'Attendance Record Corrected',
              message: messageBody,
              type: NotificationType.ATTENDANCE,
              link: '/parent',
              read: false,
              metadata: {
                studentId: corr.studentId,
                studentName,
                attendanceSessionId: session.id,
                attendanceDate: new Date(session.attendanceDate).toISOString(),
                alertType: 'CORRECTION',
                newStatus: corr.newStatus,
              },
            },
          });
        }
      } else if (corr.oldStatus !== 'ABSENT' && corr.newStatus === 'ABSENT') {
        // If student was corrected to ABSENT, dispatch absence alert
        await this.dispatchAutomatedAbsenceAlerts(session, txOrPrisma);
      }
    }
  }
}

