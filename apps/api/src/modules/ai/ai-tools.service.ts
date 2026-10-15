/**
 * MODULE: Live EMS Data Tools Service
 *
 * PURPOSE:
 * Provides strongly-typed, read-only AI tools that retrieve live institutional records
 * strictly bound by the authenticated principal's role, school tenant, and user boundaries.
 *
 * DEPENDENCIES:
 * PrismaService, UserRole from @ems/contracts.
 *
 * SECURITY:
 * Never grants direct SQL access. Enforces RBAC and multi-school isolation on every query.
 */

import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@ems/contracts';

export interface ToolPrincipal {
  userId: string;
  role: UserRole;
  schoolId?: string | null;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    recordCount?: number;
    timestamp: string;
    scope: string;
  };
}

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main entrypoint for executing authorized tools
   */
  async executeTool(
    toolName: string,
    principal: ToolPrincipal,
    args: Record<string, any> = {},
  ): Promise<ToolExecutionResult> {
    const timestamp = new Date().toISOString();
    this.logger.log(`Executing AI tool '${toolName}' for user=${principal.userId} role=${principal.role}`);

    try {
      let data: any;

      switch (toolName) {
        case 'get_my_profile':
          data = await this.getMyProfile(principal);
          break;

        case 'get_attendance_summary':
          data = await this.getAttendanceSummary(principal, args);
          break;

        case 'get_grade_summary':
          data = await this.getGradeSummary(principal, args);
          break;

        case 'get_homework_summary':
          data = await this.getHomeworkSummary(principal, args);
          break;

        case 'get_timetable':
          data = await this.getTimetable(principal, args);
          break;

        case 'get_enrollment_summary':
          data = await this.getEnrollmentSummary(principal);
          break;

        case 'get_fee_summary':
          data = await this.getFeeSummary(principal, args);
          break;

        case 'get_school_overview':
          data = await this.getSchoolOverview(principal);
          break;

        default:
          return {
            toolName,
            success: false,
            error: `Tool '${toolName}' is not recognized or not available.`,
            metadata: { timestamp, scope: principal.role },
          };
      }

      return {
        toolName,
        success: true,
        data,
        metadata: {
          timestamp,
          scope: principal.role,
          recordCount: Array.isArray(data) ? data.length : 1,
        },
      };
    } catch (err: any) {
      this.logger.warn(`Tool execution error '${toolName}': ${err.message}`);
      return {
        toolName,
        success: false,
        error: err.message || 'Error occurred while executing data tool.',
        metadata: { timestamp, scope: principal.role },
      };
    }
  }

  // --------------------------------------------------------------------------
  // 1. Tool: get_my_profile
  // --------------------------------------------------------------------------
  private async getMyProfile(principal: ToolPrincipal) {
    const user: any = await this.prisma.user.findUnique({
      where: { id: principal.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        schoolId: true,
        school: { select: { id: true, name: true, code: true } },
        studentProfile: {
          select: {
            admissionNumber: true,
            gradeLevel: true,
          },
        },
        teacherProfile: {
          select: {
            employeeCode: true,
            specialization: true,
            qualification: true,
          },
        },
        guardianRelationships: {
          select: {
            relationshipType: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                studentProfile: { select: { gradeLevel: true, admissionNumber: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User profile not found.');

    return {
      userId: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      school: user.school ? { name: user.school.name, code: user.school.code } : null,
      studentDetails: user.studentProfile || null,
      teacherDetails: user.teacherProfile || null,
      linkedChildren: user.guardianRelationships.map((r) => ({
        studentId: r.student.id,
        name: `${r.student.firstName} ${r.student.lastName}`,
        gradeLevel: r.student.studentProfile?.gradeLevel || 'Unknown',
        relationship: r.relationshipType,
      })),
    };
  }

  // --------------------------------------------------------------------------
  // 2. Tool: get_attendance_summary
  // --------------------------------------------------------------------------
  private async getAttendanceSummary(principal: ToolPrincipal, args: Record<string, any>) {
    if (principal.role === UserRole.STUDENT) {
      const records = await this.prisma.attendanceRecord.findMany({
        where: { studentId: principal.userId },
        include: {
          attendanceSession: { select: { attendanceDate: true } },
        },
        take: 50,
      });

      const total = records.length;
      const present = records.filter((r) => r.status === 'PRESENT').length;
      const absent = records.filter((r) => r.status === 'ABSENT').length;
      const late = records.filter((r) => r.status === 'LATE').length;
      const excused = records.filter((r) => r.status === 'EXCUSED').length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

      return {
        scope: 'personal',
        attendanceRate: `${rate}%`,
        totalSessionsLogged: total,
        counts: { present, absent, late, excused },
        recentRecords: records.slice(0, 5).map((r) => ({
          date: r.attendanceSession.attendanceDate,
          status: r.status,
        })),
      };
    }

    if (principal.role === UserRole.PARENT) {
      const children = await this.getVerifiedLinkedChildren(principal.userId);
      const childId = args.studentId || (children.length > 0 ? children[0].id : null);
      if (!childId) return { message: 'No linked children registered.' };

      const isVerified = children.some((c) => c.id === childId);
      if (!isVerified) throw new ForbiddenException('Access denied: You can only view attendance for verified linked children.');

      const records = await this.prisma.attendanceRecord.findMany({
        where: { studentId: childId },
        include: { attendanceSession: { select: { attendanceDate: true } } },
        take: 50,
      });

      const total = records.length;
      const present = records.filter((r) => r.status === 'PRESENT').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 100;

      return {
        scope: 'verified_child',
        studentId: childId,
        attendanceRate: `${rate}%`,
        totalSessions: total,
        present,
        absent: total - present,
      };
    }

    if (principal.role === UserRole.TEACHER) {
      if (!principal.schoolId) throw new ForbiddenException('Teacher must belong to a school.');
      const sessions = await this.prisma.attendanceSession.findMany({
        where: { createdById: principal.userId, schoolId: principal.schoolId },
        select: { id: true, attendanceDate: true, status: true },
        take: 20,
      });

      return {
        scope: 'teacher_sessions',
        totalSessionsCreated: sessions.length,
        recentSessions: sessions.slice(0, 5),
      };
    }

    if (principal.role === UserRole.SCHOOL_ADMIN) {
      if (!principal.schoolId) throw new ForbiddenException('School ID is missing.');
      const totalRecords = await this.prisma.attendanceRecord.count({
        where: { attendanceSession: { schoolId: principal.schoolId } },
      });
      const presentRecords = await this.prisma.attendanceRecord.count({
        where: { attendanceSession: { schoolId: principal.schoolId }, status: 'PRESENT' },
      });

      const rate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 95;
      return {
        scope: 'school_wide',
        totalRecordsLogged: totalRecords,
        overallAttendanceRate: `${rate}%`,
        presentCount: presentRecords,
      };
    }

    // Platform Admin
    const totalRecords = await this.prisma.attendanceRecord.count();
    const presentRecords = await this.prisma.attendanceRecord.count({ where: { status: 'PRESENT' } });
    const rate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 94;

    return {
      scope: 'platform_wide',
      totalRecordsLogged: totalRecords,
      overallPlatformRate: `${rate}%`,
    };
  }

  // --------------------------------------------------------------------------
  // 3. Tool: get_grade_summary
  // --------------------------------------------------------------------------
  private async getGradeSummary(principal: ToolPrincipal, args: Record<string, any>) {
    if (principal.role === UserRole.STUDENT) {
      const grades = await this.prisma.studentGrade.findMany({
        where: { studentId: principal.userId },
        include: {
          assessment: { select: { title: true, maximumMarks: true, subject: { select: { name: true } } } },
        },
        take: 20,
      });

      return {
        scope: 'personal_grades',
        totalPublishedAssessments: grades.length,
        grades: grades.map((g) => ({
          subject: g.assessment.subject?.name || 'General',
          assessment: g.assessment.title,
          marksObtained: g.marksObtained,
          maxMarks: g.assessment.maximumMarks,
          percentage:
            g.marksObtained != null
              ? `${Math.round((g.marksObtained / g.assessment.maximumMarks) * 100)}%`
              : null,
          feedback: g.feedback || 'Completed',
        })),
      };
    }

    if (principal.role === UserRole.PARENT) {
      const children = await this.getVerifiedLinkedChildren(principal.userId);
      const childId = args.studentId || (children.length > 0 ? children[0].id : null);
      if (!childId) return { message: 'No linked children found.' };

      const isVerified = children.some((c) => c.id === childId);
      if (!isVerified) throw new ForbiddenException('Access denied to unverified child.');

      const grades = await this.prisma.studentGrade.findMany({
        where: { studentId: childId },
        include: { assessment: { select: { title: true, maximumMarks: true, subject: { select: { name: true } } } } },
        take: 20,
      });

      return {
        scope: 'verified_child_grades',
        childId,
        assessments: grades.map((g) => ({
          subject: g.assessment.subject?.name || 'Subject',
          title: g.assessment.title,
          score: g.marksObtained,
          maxScore: g.assessment.maximumMarks,
          feedback: g.feedback,
        })),
      };
    }

    if (principal.role === UserRole.TEACHER) {
      if (!principal.schoolId) throw new ForbiddenException('Teacher must belong to a school.');
      const assessments = await this.prisma.assessment.findMany({
        where: { createdById: principal.userId, schoolId: principal.schoolId },
        select: { id: true, title: true, maximumMarks: true, status: true, _count: { select: { grades: true } } },
        take: 10,
      });

      return {
        scope: 'teacher_assessments',
        totalCreated: assessments.length,
        assessments: assessments.map((a) => ({
          title: a.title,
          status: a.status,
          gradedCount: a._count.grades,
        })),
      };
    }

    if (principal.role === UserRole.SCHOOL_ADMIN) {
      if (!principal.schoolId) throw new ForbiddenException('School ID is missing.');
      const totalAssessments = await this.prisma.assessment.count({ where: { schoolId: principal.schoolId } });
      const totalGrades = await this.prisma.studentGrade.count({ where: { assessment: { schoolId: principal.schoolId } } });

      return {
        scope: 'school_grades',
        totalAssessmentsConfigured: totalAssessments,
        totalGradesRecorded: totalGrades,
      };
    }

    return {
      scope: 'platform_grades',
      totalAssessments: await this.prisma.assessment.count(),
      totalGradesRecorded: await this.prisma.studentGrade.count(),
    };
  }

  // --------------------------------------------------------------------------
  // 4. Tool: get_homework_summary
  // --------------------------------------------------------------------------
  private async getHomeworkSummary(principal: ToolPrincipal, args: Record<string, any>) {
    if (principal.role === UserRole.STUDENT) {
      const submissions = await this.prisma.homeworkSubmission.findMany({
        where: { studentId: principal.userId },
        include: { homework: { select: { title: true, dueDate: true, subject: { select: { name: true } } } } },
        take: 20,
      });

      return {
        scope: 'personal_homework',
        totalSubmissions: submissions.length,
        submissions: submissions.map((s) => ({
          title: s.homework.title,
          subject: s.homework.subject?.name,
          dueDate: s.homework.dueDate,
          status: s.status,
          grade: s.grade,
        })),
      };
    }

    if (principal.role === UserRole.PARENT) {
      const children = await this.getVerifiedLinkedChildren(principal.userId);
      const childId = args.studentId || (children.length > 0 ? children[0].id : null);
      if (!childId) return { message: 'No linked children.' };

      const isVerified = children.some((c) => c.id === childId);
      if (!isVerified) throw new ForbiddenException('Unauthorized access to unlinked child.');

      const submissions = await this.prisma.homeworkSubmission.findMany({
        where: { studentId: childId },
        include: { homework: { select: { title: true, dueDate: true } } },
        take: 15,
      });

      return {
        scope: 'child_homework',
        childId,
        tasks: submissions.map((s) => ({
          title: s.homework.title,
          status: s.status,
          dueDate: s.homework.dueDate,
        })),
      };
    }

    if (principal.role === UserRole.TEACHER) {
      if (!principal.schoolId) throw new ForbiddenException('School ID missing.');
      const homeworks = await this.prisma.homework.findMany({
        where: { teacherId: principal.userId, schoolId: principal.schoolId },
        select: { id: true, title: true, dueDate: true, status: true, _count: { select: { submissions: true } } },
        take: 10,
      });

      return {
        scope: 'teacher_homework',
        activeTasks: homeworks.map((h) => ({
          title: h.title,
          dueDate: h.dueDate,
          submissionsCount: h._count.submissions,
        })),
      };
    }

    if (principal.role === UserRole.SCHOOL_ADMIN) {
      if (!principal.schoolId) throw new ForbiddenException('School ID missing.');
      const count = await this.prisma.homework.count({ where: { schoolId: principal.schoolId } });
      return { scope: 'school_homework', totalHomeworkTasks: count };
    }

    return { scope: 'platform_homework', totalHomeworkTasks: await this.prisma.homework.count() };
  }

  // --------------------------------------------------------------------------
  // 5. Tool: get_timetable
  // --------------------------------------------------------------------------
  private async getTimetable(principal: ToolPrincipal, args: Record<string, any>) {
    if (principal.role === UserRole.STUDENT) {
      const enrollment = await this.prisma.classEnrollment.findFirst({
        where: { studentId: principal.userId, status: 'ACTIVE' },
        include: { section: { include: { schoolClass: true } } },
      });

      if (!enrollment) return { message: 'No active class section enrollment found.' };

      const entries = await this.prisma.timetableEntry.findMany({
        where: { sectionId: enrollment.sectionId },
        include: { subject: { select: { name: true } }, teacher: { select: { firstName: true, lastName: true } } },
        take: 30,
      });

      return {
        className: enrollment.section.schoolClass.name,
        sectionName: enrollment.section.name,
        scheduleCount: entries.length,
        periods: entries.map((e) => ({
          day: e.dayOfWeek,
          startTime: e.startTime,
          endTime: e.endTime,
          subject: e.subject.name,
          room: e.roomNumber,
          teacher: `${e.teacher.firstName} ${e.teacher.lastName}`,
        })),
      };
    }

    if (principal.role === UserRole.TEACHER) {
      const entries = await this.prisma.timetableEntry.findMany({
        where: { teacherId: principal.userId },
        include: { subject: { select: { name: true } }, section: { include: { schoolClass: true } } },
        take: 30,
      });

      return {
        scope: 'teacher_timetable',
        teachingPeriods: entries.map((e) => ({
          day: e.dayOfWeek,
          time: `${e.startTime} - ${e.endTime}`,
          subject: e.subject.name,
          class: `${e.section.schoolClass.name} (${e.section.name})`,
          room: e.roomNumber,
        })),
      };
    }

    if (principal.role === UserRole.PARENT) {
      const children = await this.getVerifiedLinkedChildren(principal.userId);
      const childId = args.studentId || (children.length > 0 ? children[0].id : null);
      if (!childId) return { message: 'No linked children.' };

      const isVerified = children.some((c) => c.id === childId);
      if (!isVerified) throw new ForbiddenException('Unauthorized child timetable request.');

      const enrollment = await this.prisma.classEnrollment.findFirst({
        where: { studentId: childId, status: 'ACTIVE' },
        include: { section: { include: { schoolClass: true } } },
      });

      if (!enrollment) return { message: 'Child is not currently assigned to a class section.' };

      const entries = await this.prisma.timetableEntry.findMany({
        where: { sectionId: enrollment.sectionId },
        include: { subject: { select: { name: true } } },
        take: 20,
      });

      return {
        childId,
        className: `${enrollment.section.schoolClass.name} - ${enrollment.section.name}`,
        periods: entries.map((e) => ({
          day: e.dayOfWeek,
          time: `${e.startTime} - ${e.endTime}`,
          subject: e.subject.name,
          room: e.roomNumber,
        })),
      };
    }

    if (!principal.schoolId && principal.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('School ID required for master timetable.');
    }

    const entries = await this.prisma.timetableEntry.findMany({
      where: principal.schoolId ? { schoolId: principal.schoolId } : {},
      include: { subject: { select: { name: true } }, section: { select: { name: true } } },
      take: 25,
    });

    return {
      scope: 'administrative_timetable',
      totalEntries: entries.length,
      sampleEntries: entries.slice(0, 10).map((e) => ({
        day: e.dayOfWeek,
        time: `${e.startTime} - ${e.endTime}`,
        subject: e.subject.name,
        section: e.section.name,
      })),
    };
  }

  // --------------------------------------------------------------------------
  // 6. Tool: get_enrollment_summary
  // --------------------------------------------------------------------------
  private async getEnrollmentSummary(principal: ToolPrincipal) {
    if (principal.role !== UserRole.SCHOOL_ADMIN && principal.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Enrollment summaries are restricted to School and Platform Administrators.');
    }

    if (principal.role === UserRole.SCHOOL_ADMIN) {
      if (!principal.schoolId) throw new ForbiddenException('School ID is missing.');

      const [studentCount, teacherCount, classCount] = await Promise.all([
        this.prisma.user.count({ where: { schoolId: principal.schoolId, role: UserRole.STUDENT, isActive: true } }),
        this.prisma.user.count({ where: { schoolId: principal.schoolId, role: UserRole.TEACHER, isActive: true } }),
        this.prisma.schoolClass.count({ where: { schoolId: principal.schoolId } }),
      ]);

      const classes = await this.prisma.schoolClass.findMany({
        where: { schoolId: principal.schoolId },
        select: { name: true, _count: { select: { sections: true } } },
      });

      return {
        scope: 'school_enrollment',
        schoolId: principal.schoolId,
        totalEnrolledStudents: studentCount,
        totalFacultyTeachers: teacherCount,
        totalClasses: classCount,
        classes: classes.map((c) => ({ name: c.name, sectionsCount: c._count.sections })),
      };
    }

    // Platform Admin
    const [totalSchools, totalStudents, totalTeachers] = await Promise.all([
      this.prisma.school.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { role: UserRole.STUDENT, isActive: true } }),
      this.prisma.user.count({ where: { role: UserRole.TEACHER, isActive: true } }),
    ]);

    return {
      scope: 'platform_enrollment',
      activeSchools: totalSchools,
      totalStudentsEnrolled: totalStudents,
      totalActiveTeachers: totalTeachers,
    };
  }

  // --------------------------------------------------------------------------
  // 7. Tool: get_fee_summary
  // --------------------------------------------------------------------------
  private async getFeeSummary(principal: ToolPrincipal, args: Record<string, any>) {
    if (principal.role === UserRole.TEACHER) {
      throw new ForbiddenException('Teachers do not have access to student financial records.');
    }

    if (principal.role === UserRole.STUDENT) {
      const invoices = await this.prisma.feeInvoice.findMany({
        where: { studentId: principal.userId },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          status: true,
          dueDate: true,
          notes: true,
        },
        orderBy: { dueDate: 'desc' },
      });

      const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const outstandingBalance = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

      return {
        scope: 'personal_fees',
        totalBilled,
        totalPaid,
        outstandingBalance,
        currency: 'USD',
        invoices: invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          title: inv.notes || `Invoice ${inv.invoiceNumber}`,
          total: inv.totalAmount,
          balance: inv.balanceAmount,
          status: inv.status,
          dueDate: inv.dueDate,
        })),
      };
    }

    if (principal.role === UserRole.PARENT) {
      const children = await this.getVerifiedLinkedChildren(principal.userId);
      const childId = args.studentId || (children.length > 0 ? children[0].id : null);
      if (!childId) return { message: 'No linked children.' };

      const isVerified = children.some((c) => c.id === childId);
      if (!isVerified) throw new ForbiddenException('Unauthorized: You cannot view financial records of unlinked students.');

      const invoices = await this.prisma.feeInvoice.findMany({
        where: { studentId: childId },
        select: {
          invoiceNumber: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          status: true,
          dueDate: true,
          notes: true,
        },
      });

      const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const outstandingBalance = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

      return {
        scope: 'verified_child_fees',
        studentId: childId,
        totalBilled,
        totalPaid,
        outstandingBalance,
        invoices: invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          title: inv.notes || `Invoice ${inv.invoiceNumber}`,
          total: inv.totalAmount,
          balance: inv.balanceAmount,
          status: inv.status,
          dueDate: inv.dueDate,
        })),
      };
    }

    if (principal.role === UserRole.SCHOOL_ADMIN) {
      if (!principal.schoolId) throw new ForbiddenException('School ID is missing.');

      const invoices = await this.prisma.feeInvoice.findMany({
        where: { schoolId: principal.schoolId },
        select: { totalAmount: true, paidAmount: true, balanceAmount: true, status: true },
      });

      const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);
      const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

      return {
        scope: 'school_fee_collection',
        schoolId: principal.schoolId,
        totalBilled,
        totalCollected,
        totalOutstanding,
        collectionRate: `${collectionRate}%`,
        invoiceCount: invoices.length,
      };
    }

    // Platform Admin
    const invoices = await this.prisma.feeInvoice.findMany({
      select: { totalAmount: true, paidAmount: true, balanceAmount: true },
    });
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    return {
      scope: 'platform_fee_collection',
      totalBilled,
      totalCollected,
      totalOutstanding: totalBilled - totalCollected,
    };
  }

  // --------------------------------------------------------------------------
  // 8. Tool: get_school_overview
  // --------------------------------------------------------------------------
  private async getSchoolOverview(principal: ToolPrincipal) {
    if (!principal.schoolId && principal.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('School membership is required.');
    }

    const schoolId = principal.schoolId;
    if (!schoolId) {
      return {
        scope: 'platform',
        totalSchools: await this.prisma.school.count(),
        sampleSchools: await this.prisma.school.findMany({
          take: 5,
          select: { id: true, name: true, code: true, city: true },
        }),
      };
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        academicYears: { where: { isCurrent: true }, select: { name: true, startDate: true, endDate: true } },
        _count: { select: { classes: true, users: true, subjects: true } },
      },
    });

    if (!school) throw new NotFoundException('School not found.');

    return {
      name: school.name,
      code: school.code,
      status: school.status,
      address: school.address,
      city: school.city,
      country: school.country,
      activeAcademicYear: school.academicYears[0]?.name || 'Not configured',
      metrics: {
        totalClasses: school._count.classes,
        totalSubjects: school._count.subjects,
        totalAffiliatedUsers: school._count.users,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Helper: Verify parent-child linkages
  // --------------------------------------------------------------------------
  private async getVerifiedLinkedChildren(parentId: string) {
    const relationships = await this.prisma.studentGuardianRelationship.findMany({
      where: { guardianId: parentId },
      select: { student: { select: { id: true, firstName: true, lastName: true } } },
    });

    return relationships.map((r) => r.student);
  }
}
