/**
 * MODULE: Dashboards & Institutional Analytics Service
 *
 * PURPOSE:
 * Computes authentic, zero-fabrication aggregations and analytical metrics
 * across all institutional roles: Platform Admin, School Admin, Teacher,
 * Student, and Parent.
 *
 * DEPENDENCIES:
 * PrismaService, @ems/contracts
 *
 * SECURITY:
 * Strict school-level data scoping, verified guardian linkage enforcement,
 * and role authorization guards on every aggregation endpoint.
 */

import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamStatus } from '@prisma/client';
import {
  AuthUser,
  UserRole,
  PlatformAdminDashboardDto,
  SchoolAdminDashboardDto,
  TeacherDashboardDto,
  StudentDashboardDto,
  ParentDashboardDto,
  RelationshipVerificationStatus,
} from '@ems/contracts';

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to determine integer day of week (1 = Monday, ..., 7 = Sunday)
   */
  private getCurrentDayOfWeek(): number {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
  }

  // ============================================================================
  // 1. PLATFORM ADMINISTRATOR DASHBOARD
  // ============================================================================
  async getPlatformAdminDashboard(
    user: AuthUser,
  ): Promise<PlatformAdminDashboardDto> {
    if (user.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Access restricted to Platform Administrators.');
    }

    const [
      totalSchools,
      activeSchools,
      totalTeachers,
      totalStudents,
      totalParents,
      activeSubscriptions,
      expiredSubscriptions,
      schoolsList,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { role: 'TEACHER' } }),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.user.count({ where: { role: 'PARENT' } }),
      this.prisma.schoolSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.schoolSubscription.count({ where: { status: 'EXPIRED' } }),
      this.prisma.school.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          users: {
            select: { role: true },
          },
        },
        take: 20,
      }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          actorEmail: true,
          createdAt: true,
        },
      }),
    ]);

    // School comparisons with real counts
    const schoolComparisons = schoolsList.map((s) => {
      const studentsCount = s.users.filter((u) => u.role === 'STUDENT').length;
      const teachersCount = s.users.filter((u) => u.role === 'TEACHER').length;
      return {
        schoolId: s.id,
        schoolName: s.name,
        code: s.code,
        studentsCount,
        teachersCount,
        status: s.status,
      };
    });

    // Real enrollment trends (last 6 months)
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const enrollmentTrends: Array<{ month: string; students: number; teachers: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const mLabel = monthNames[d.getMonth()];

      const [sCount, tCount] = await Promise.all([
        this.prisma.user.count({
          where: {
            role: 'STUDENT',
            createdAt: { gte: d, lt: nextMonth },
          },
        }),
        this.prisma.user.count({
          where: {
            role: 'TEACHER',
            createdAt: { gte: d, lt: nextMonth },
          },
        }),
      ]);

      enrollmentTrends.push({
        month: mLabel,
        students: sCount,
        teachers: tCount,
      });
    }

    // Attendance trends across recent finalized sessions
    const recentSessions = await this.prisma.attendanceSession.findMany({
      where: { status: 'FINALIZED' },
      take: 7,
      orderBy: { attendanceDate: 'desc' },
      include: {
        records: {
          select: { status: true },
        },
      },
    });

    const attendanceTrends = recentSessions.map((sess) => {
      const total = sess.records.length;
      const present = sess.records.filter((r) => r.status === 'PRESENT').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        date: sess.attendanceDate.toISOString().split('T')[0],
        percentage,
      };
    }).reverse();

    return {
      totalSchools,
      activeSchools,
      totalTeachers,
      totalStudents,
      totalParents,
      activeSubscriptions,
      expiredSubscriptions,
      enrollmentTrends,
      schoolComparisons,
      attendanceTrends,
      recentAdministrativeEvents: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        actorEmail: log.actorEmail,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  // ============================================================================
  // 2. SCHOOL ADMINISTRATOR DASHBOARD
  // ============================================================================
  async getSchoolAdminDashboard(
    user: AuthUser,
    querySchoolId?: string,
  ): Promise<SchoolAdminDashboardDto> {
    const schoolId =
      user.role === UserRole.PLATFORM_ADMIN
        ? querySchoolId || user.schoolId
        : user.schoolId;

    if (!schoolId) {
      throw new ForbiddenException('A valid school context is required.');
    }

    const [totalStudents, totalTeachers, activeClasses] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: 'STUDENT' } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER' } }),
      this.prisma.classSection.count({ where: { schoolClass: { schoolId } } }),
    ]);

    // Attendance stats
    const recentSessions = await this.prisma.attendanceSession.findMany({
      where: { schoolId, status: 'FINALIZED' },
      take: 7,
      orderBy: { attendanceDate: 'desc' },
      include: { records: { select: { status: true } } },
    });

    const attendanceTrends = recentSessions.map((sess) => {
      const total = sess.records.length;
      const present = sess.records.filter((r) => r.status === 'PRESENT').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        date: sess.attendanceDate.toISOString().split('T')[0],
        percentage,
      };
    }).reverse();

    const latestSession = recentSessions[0];
    const dailyAttendancePercentage =
      latestSession && latestSession.records && latestSession.records.length > 0
        ? Math.round(
            (latestSession.records.filter((r) => r.status === 'PRESENT').length /
              latestSession.records.length) *
              100,
          )
        : 0;

    // Grade distribution from StudentGrades in this school
    const schoolGrades = await this.prisma.studentGrade.findMany({
      where: {
        assessment: { schoolId },
        marksObtained: { not: null },
      },
      include: {
        assessment: { select: { maximumMarks: true } },
      },
    });

    const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    schoolGrades.forEach((g) => {
      if (g.marksObtained !== null && g.assessment.maximumMarks > 0) {
        const pct = (g.marksObtained / g.assessment.maximumMarks) * 100;
        if (pct >= 85) gradeCounts['A']++;
        else if (pct >= 70) gradeCounts['B']++;
        else if (pct >= 55) gradeCounts['C']++;
        else if (pct >= 40) gradeCounts['D']++;
        else gradeCounts['F']++;
      }
    });

    const gradeDistribution = Object.entries(gradeCounts).map(([letterGrade, count]) => ({
      letterGrade,
      count,
    }));

    // Subject performance
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId },
      include: {
        assessments: {
          include: {
            grades: {
              where: { marksObtained: { not: null } },
              select: { marksObtained: true },
            },
          },
        },
      },
      take: 10,
    });

    const subjectPerformance = subjects.map((subj) => {
      let totalMarks = 0;
      let totalMaxMarks = 0;

      subj.assessments.forEach((a) => {
        a.grades.forEach((g) => {
          if (g.marksObtained !== null) {
            totalMarks += g.marksObtained;
            totalMaxMarks += a.maximumMarks;
          }
        });
      });

      const avg =
        totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0;

      return {
        subjectName: subj.name,
        averagePercentage: avg,
      };
    });

    // Homework completion rate
    const [totalHw, submittedHw] = await Promise.all([
      this.prisma.homework.count({ where: { schoolId } }),
      this.prisma.homeworkSubmission.count({
        where: {
          homework: { schoolId },
          status: { in: ['SUBMITTED', 'GRADED', 'LATE'] },
        },
      }),
    ]);
    const expectedSubmissions = totalHw * (totalStudents || 1);
    const homeworkCompletionRate =
      expectedSubmissions > 0
        ? Math.min(100, Math.round((submittedHw / expectedSubmissions) * 100))
        : 0;

    // Upcoming exams
    const upcomingExamsList = await this.prisma.exam.findMany({
      where: {
        schoolId,
        status: { in: [ExamStatus.SCHEDULED, ExamStatus.IN_PROGRESS, ExamStatus.RESULTS_PUBLISHED] },
      },
      orderBy: { examDate: 'asc' },
      take: 5,
      include: {
        subject: { select: { name: true } },
        classSection: { select: { name: true } },
      },
    });

    const upcomingExams = upcomingExamsList.map((ex) => ({
      id: ex.id,
      title: ex.title,
      subjectName: ex.subject.name,
      className: ex.classSection.name,
      examDate: ex.examDate.toISOString(),
    }));

    // Recent school activity
    const recentLogs = await this.prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const recentActivity = recentLogs.map((log) => ({
      id: log.id,
      action: log.action,
      details: `${log.entityType}: ${log.action.toLowerCase()}`,
      timestamp: log.createdAt.toISOString(),
    }));

    return {
      totalStudents,
      totalTeachers,
      activeClasses,
      dailyAttendancePercentage,
      attendanceTrends,
      gradeDistribution,
      subjectPerformance,
      homeworkCompletionRate,
      upcomingExamsCount: upcomingExamsList.length,
      upcomingExams,
      recentActivity,
    };
  }

  // ============================================================================
  // 3. TEACHER DASHBOARD
  // ============================================================================
  async getTeacherDashboard(user: AuthUser): Promise<TeacherDashboardDto> {
    if (user.role !== UserRole.TEACHER) {
      throw new ForbiddenException('Access restricted to verified faculty.');
    }

    // Assigned class sections
    const classSections = await this.prisma.classSection.findMany({
      where: {
        OR: [
          { classTeacherId: user.id },
          { timetableEntries: { some: { teacherId: user.id } } },
        ],
      },
      include: {
        schoolClass: { select: { name: true } },
        enrollments: { where: { status: 'ACTIVE' } },
        teacherSubjectAssignments: {
          where: { teacherId: user.id },
          include: { subject: { select: { name: true } } },
        },
      },
    });

    const assignedClasses = classSections.map((cs) => ({
      id: cs.id,
      name: cs.name,
      className: cs.schoolClass.name,
      studentsCount: cs.enrollments.length,
      subjects: cs.teacherSubjectAssignments.map((sa) => sa.subject.name),
    }));

    // Today's schedule
    const currentDay = this.getCurrentDayOfWeek();
    const scheduleEntries = await this.prisma.timetableEntry.findMany({
      where: {
        teacherId: user.id,
        dayOfWeek: currentDay,
      },
      orderBy: { startTime: 'asc' },
      include: {
        subject: { select: { name: true } },
        section: {
          include: { schoolClass: { select: { name: true } } },
        },
      },
    });

    const todaySchedule = scheduleEntries.map((entry) => ({
      id: entry.id,
      periodName: entry.periodName || 'Class Period',
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectName: entry.subject.name,
      className: `${entry.section.schoolClass.name} - ${entry.section.name}`,
      roomNumber: entry.roomNumber,
    }));

    // Pending counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todaySessions, pendingHwReviews, pendingGrading] = await Promise.all([
      this.prisma.attendanceSession.count({
        where: {
          createdById: user.id,
          attendanceDate: { gte: today },
          status: 'FINALIZED',
        },
      }),
      this.prisma.homeworkSubmission.count({
        where: {
          homework: { teacherId: user.id },
          status: { in: ['SUBMITTED', 'LATE'] },
        },
      }),
      this.prisma.studentGrade.count({
        where: {
          assessment: { createdById: user.id },
          marksObtained: null,
        },
      }),
    ]);

    const pendingAttendanceCount = Math.max(0, scheduleEntries.length - todaySessions);

    // Class performance for classes taught
    const classPerformance = await Promise.all(
      classSections.slice(0, 5).map(async (cs) => {
        const assessments = await this.prisma.assessment.findMany({
          where: { classSectionId: cs.id, createdById: user.id },
          include: {
            grades: {
              where: { marksObtained: { not: null } },
              select: { marksObtained: true },
            },
          },
        });

        let totalMarks = 0;
        let totalMax = 0;
        assessments.forEach((a) => {
          a.grades.forEach((g) => {
            if (g.marksObtained !== null) {
              totalMarks += g.marksObtained;
              totalMax += a.maximumMarks;
            }
          });
        });

        const avg = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

        return {
          className: `${cs.schoolClass.name} - ${cs.name}`,
          subjectName: cs.teacherSubjectAssignments[0]?.subject.name || 'General',
          averagePercentage: avg,
        };
      }),
    );

    // Upcoming exams created by or relevant to teacher
    const exams = await this.prisma.exam.findMany({
      where: {
        createdById: user.id,
        status: { in: [ExamStatus.SCHEDULED, ExamStatus.IN_PROGRESS, ExamStatus.RESULTS_PUBLISHED] },
      },
      orderBy: { examDate: 'asc' },
      take: 5,
      include: {
        subject: { select: { name: true } },
        classSection: { select: { name: true } },
      },
    });

    const upcomingExams = exams.map((ex) => ({
      id: ex.id,
      title: ex.title,
      className: ex.classSection.name,
      subjectName: ex.subject.name,
      examDate: ex.examDate.toISOString(),
    }));

    // Recent direct messages
    const messages = await this.prisma.directMessage.findMany({
      where: {
        conversation: {
          participants: { some: { userId: user.id } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    return {
      assignedClassesCount: assignedClasses.length,
      assignedClasses,
      todaySchedule,
      pendingAttendanceCount,
      pendingHomeworkReviewsCount: pendingHwReviews,
      pendingGradingCount: pendingGrading,
      classPerformance,
      upcomingExams,
      recentMessages: messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: `${m.sender.firstName} ${m.sender.lastName}`,
        senderRole: m.sender.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  // ============================================================================
  // 4. STUDENT DASHBOARD
  // ============================================================================
  async getStudentDashboard(user: AuthUser): Promise<StudentDashboardDto> {
    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Access restricted to enrolled students.');
    }

    // Attendance calculation
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { studentId: user.id },
      select: { status: true },
    });

    const totalAttendance = attendanceRecords.length;
    const presentAttendance = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const lateAttendance = attendanceRecords.filter((r) => r.status === 'LATE').length;
    const attendancePercentage =
      totalAttendance > 0
        ? Math.round(((presentAttendance + lateAttendance * 0.5) / totalAttendance) * 100)
        : 100;

    // Academic performance & GPA
    const studentGrades = await this.prisma.studentGrade.findMany({
      where: { studentId: user.id, marksObtained: { not: null } },
      include: {
        assessment: {
          include: { subject: { select: { name: true } } },
        },
      },
    });

    let overallPercentage: number | null = null;
    let gpa: number | null = null;
    let letterGrade: string | null = null;

    if (studentGrades.length > 0) {
      let totalMarks = 0;
      let totalMax = 0;
      studentGrades.forEach((g) => {
        if (g.marksObtained !== null && g.assessment.maximumMarks > 0) {
          totalMarks += g.marksObtained;
          totalMax += g.assessment.maximumMarks;
        }
      });

      if (totalMax > 0) {
        overallPercentage = Math.round((totalMarks / totalMax) * 100);
        gpa = Math.round((overallPercentage / 20) * 10) / 10;
        letterGrade =
          overallPercentage >= 85
            ? 'A'
            : overallPercentage >= 70
              ? 'B'
              : overallPercentage >= 55
                ? 'C'
                : overallPercentage >= 40
                  ? 'D'
                  : 'F';
      }
    }

    // Student enrollment section
    const activeEnrollment = await this.prisma.classEnrollment.findFirst({
      where: { studentId: user.id, status: 'ACTIVE' },
      include: {
        section: {
          include: {
            schoolClass: { select: { name: true } },
          },
        },
      },
    });

    const sectionId = activeEnrollment?.sectionId;

    // Today's schedule
    const currentDay = this.getCurrentDayOfWeek();
    const todayEntries = sectionId
      ? await this.prisma.timetableEntry.findMany({
          where: {
            sectionId,
            dayOfWeek: currentDay,
          },
          orderBy: { startTime: 'asc' },
          include: {
            subject: { select: { name: true } },
          },
        })
      : [];

    const todaySchedule = todayEntries.map((t) => ({
      periodName: t.periodName || 'Class Period',
      startTime: t.startTime,
      endTime: t.endTime,
      subjectName: t.subject.name,
      roomNumber: t.roomNumber,
    }));

    // Pending homework (due in the future or not submitted)
    const submittedHwIds = (
      await this.prisma.homeworkSubmission.findMany({
        where: { studentId: user.id },
        select: { homeworkId: true },
      })
    ).map((s) => s.homeworkId);

    const pendingHomeworks = sectionId
      ? await this.prisma.homework.findMany({
          where: {
            classSectionId: sectionId,
            status: 'PUBLISHED',
            id: { notIn: submittedHwIds },
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
          include: { subject: { select: { name: true } } },
        })
      : [];

    const pendingHomework = pendingHomeworks.map((hw) => ({
      id: hw.id,
      title: hw.title,
      subjectName: hw.subject.name,
      dueDate: hw.dueDate.toISOString(),
      maxPoints: hw.maxPoints,
    }));

    // Upcoming exams
    const upcomingExamsList = sectionId
      ? await this.prisma.exam.findMany({
          where: {
            classSectionId: sectionId,
            status: ExamStatus.SCHEDULED,
          },
          orderBy: { examDate: 'asc' },
          take: 5,
          include: { subject: { select: { name: true } } },
        })
      : [];

    const upcomingExams = upcomingExamsList.map((ex) => ({
      id: ex.id,
      title: ex.title,
      subjectName: ex.subject.name,
      examDate: ex.examDate.toISOString(),
      durationMinutes: ex.durationMinutes,
    }));

    // Course completion rate
    const courseEnrollments = await this.prisma.courseEnrollment.findMany({
      where: { studentId: user.id },
    });

    const completedCourses = courseEnrollments.filter((c) => c.completedAt !== null).length;
    const courseCompletionPercentage =
      courseEnrollments.length > 0
        ? Math.round((completedCourses / courseEnrollments.length) * 100)
        : 0;

    // Notifications
    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Recent grades
    const recentGrades = studentGrades.slice(0, 5).map((g) => {
      const pct =
        g.marksObtained !== null && g.assessment.maximumMarks > 0
          ? Math.round((g.marksObtained / g.assessment.maximumMarks) * 100)
          : null;
      const lGrade =
        pct !== null
          ? pct >= 85
            ? 'A'
            : pct >= 70
              ? 'B'
              : pct >= 55
                ? 'C'
                : pct >= 40
                  ? 'D'
                  : 'F'
          : null;

      return {
        id: g.id,
        title: g.assessment.title,
        subjectName: g.assessment.subject.name,
        marksObtained: g.marksObtained,
        maximumMarks: g.assessment.maximumMarks,
        percentage: pct,
        letterGrade: lGrade,
      };
    });

    return {
      attendancePercentage,
      gpa,
      overallPercentage,
      letterGrade,
      todaySchedule,
      pendingHomework,
      upcomingExams,
      courseCompletionPercentage,
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        schoolId: n.schoolId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      recentGrades,
    };
  }

  // ============================================================================
  // 5. PARENT / GUARDIAN DASHBOARD
  // ============================================================================
  async getParentDashboard(
    user: AuthUser,
    selectedChildIdQuery?: string,
  ): Promise<ParentDashboardDto> {
    if (user.role !== UserRole.PARENT) {
      throw new ForbiddenException('Access restricted to verified parents and guardians.');
    }

    // Verified student links only
    const relationships = await this.prisma.studentGuardianRelationship.findMany({
      where: {
        guardianId: user.id,
        verificationStatus: RelationshipVerificationStatus.VERIFIED,
      },
      include: {
        student: {
          include: {
            studentProfile: true,
            classEnrollments: {
              where: { status: 'ACTIVE' },
              include: {
                section: {
                  include: { schoolClass: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (relationships.length === 0) {
      return {
        children: [],
        selectedChildId: '',
        selectedChildSchedule: [],
        selectedChildRecentGrades: [],
        schoolAnnouncements: [],
        teacherMessages: [],
      };
    }

    // Children details
    const children = await Promise.all(
      relationships.map(async (rel) => {
        const student = rel.student;
        const activeEnrollment = student.classEnrollments[0];
        const className = activeEnrollment
          ? `${activeEnrollment.section.schoolClass.name} - ${activeEnrollment.section.name}`
          : 'Not Enrolled';

        // Child Attendance
        const attRecords = await this.prisma.attendanceRecord.findMany({
          where: { studentId: student.id },
          select: { status: true },
        });
        const total = attRecords.length;
        const pres = attRecords.filter((r) => r.status === 'PRESENT').length;
        const attPct = total > 0 ? Math.round((pres / total) * 100) : 100;

        // Child Grades
        const grades = await this.prisma.studentGrade.findMany({
          where: { studentId: student.id, marksObtained: { not: null } },
          include: { assessment: { select: { maximumMarks: true } } },
        });

        let avgPct: number | null = null;
        let gpa: number | null = null;
        let letter: string | null = null;

        if (grades.length > 0) {
          let sumMarks = 0;
          let sumMax = 0;
          grades.forEach((g) => {
            if (g.marksObtained !== null && g.assessment.maximumMarks > 0) {
              sumMarks += g.marksObtained;
              sumMax += g.assessment.maximumMarks;
            }
          });
          if (sumMax > 0) {
            avgPct = Math.round((sumMarks / sumMax) * 100);
            gpa = Math.round((avgPct / 20) * 10) / 10;
            letter =
              avgPct >= 85
                ? 'A'
                : avgPct >= 70
                  ? 'B'
                  : avgPct >= 55
                    ? 'C'
                    : avgPct >= 40
                      ? 'D'
                      : 'F';
          }
        }

        // Homework & Exams
        const [pendingHw, upcomingExams] = await Promise.all([
          activeEnrollment
            ? this.prisma.homework.count({
                where: {
                  classSectionId: activeEnrollment.sectionId,
                  status: 'PUBLISHED',
                  submissions: { none: { studentId: student.id } },
                },
              })
            : 0,
          activeEnrollment
            ? this.prisma.exam.count({
                where: {
                  classSectionId: activeEnrollment.sectionId,
                  status: ExamStatus.SCHEDULED,
                },
              })
            : 0,
        ]);

        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          className,
          admissionNumber: student.studentProfile?.admissionNumber || null,
          attendancePercentage: attPct,
          overallPercentage: avgPct,
          gpa,
          letterGrade: letter,
          pendingHomeworkCount: pendingHw,
          upcomingExamsCount: upcomingExams,
        };
      }),
    );

    // Selected child
    const selectedChildId =
      selectedChildIdQuery && children.some((c) => c.studentId === selectedChildIdQuery)
        ? selectedChildIdQuery
        : children[0].studentId;

    const selectedRel = relationships.find((r) => r.student.id === selectedChildId);
    const selectedSectionId = selectedRel?.student.classEnrollments[0]?.sectionId;

    // Selected child's schedule
    const currentDay = this.getCurrentDayOfWeek();
    const scheduleEntries = selectedSectionId
      ? await this.prisma.timetableEntry.findMany({
          where: { sectionId: selectedSectionId, dayOfWeek: currentDay },
          orderBy: { startTime: 'asc' },
          include: { subject: { select: { name: true } } },
        })
      : [];

    const selectedChildSchedule = scheduleEntries.map((t) => ({
      periodName: t.periodName || 'Period',
      startTime: t.startTime,
      endTime: t.endTime,
      subjectName: t.subject.name,
    }));

    // Selected child's recent grades
    const recentGrades = await this.prisma.studentGrade.findMany({
      where: { studentId: selectedChildId, marksObtained: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        assessment: {
          include: { subject: { select: { name: true } } },
        },
      },
    });

    const selectedChildRecentGrades = recentGrades.map((g) => {
      const pct =
        g.marksObtained !== null && g.assessment.maximumMarks > 0
          ? Math.round((g.marksObtained / g.assessment.maximumMarks) * 100)
          : null;
      const lGrade =
        pct !== null
          ? pct >= 85
            ? 'A'
            : pct >= 70
              ? 'B'
              : pct >= 55
                ? 'C'
                : pct >= 40
                  ? 'D'
                  : 'F'
          : null;

      return {
        title: g.assessment.title,
        subjectName: g.assessment.subject.name,
        marksObtained: g.marksObtained,
        maximumMarks: g.assessment.maximumMarks,
        percentage: pct,
        letterGrade: lGrade,
      };
    });

    // Announcements for the parent's school
    const schoolAnnouncements = await this.prisma.notification.findMany({
      where: {
        schoolId: user.schoolId || undefined,
        type: 'ANNOUNCEMENT',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Messages with teachers
    const teacherMessages = await this.prisma.directMessage.findMany({
      where: {
        conversation: {
          participants: { some: { userId: user.id } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    return {
      children,
      selectedChildId,
      selectedChildSchedule,
      selectedChildRecentGrades,
      schoolAnnouncements: schoolAnnouncements.map((a) => ({
        id: a.id,
        userId: a.userId,
        schoolId: a.schoolId,
        type: a.type,
        title: a.title,
        message: a.message,
        link: a.link,
        read: a.read,
        createdAt: a.createdAt.toISOString(),
      })),
      teacherMessages: teacherMessages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: `${m.sender.firstName} ${m.sender.lastName}`,
        senderRole: m.sender.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }
}
