/**
 * MODULE: Institutional Grades & Academic Performance Service
 *
 * PURPOSE:
 * Implements weighted grade calculations, assessment lifecycle (Draft -> Published),
 * atomic bulk gradebook marking inside PostgreSQL transactions, student/parent result scoping,
 * multi-dimensional class performance metrics, and configurable grading scales.
 *
 * DEPENDENCIES:
 * PrismaService, @ems/contracts
 *
 * SECURITY:
 * Strict school-level tenant isolation, teacher assignment authorization,
 * verified guardian validation, and immutable unpublished assessment protection.
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
  AssessmentStatus,
  RelationshipVerificationStatus,
  AssessmentCategoryDto,
  CreateAssessmentCategoryRequest,
  UpdateAssessmentCategoryRequest,
  AssessmentDto,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  StudentGradeDto,
  GradebookStudentRowDto,
  AssessmentGradebookDto,
  BulkSaveGradebookRequest,
  GradingScaleDto,
  CreateGradingScaleRequest,
  UpdateGradingScaleRequest,
  StudentSubjectPerformanceDto,
  StudentAcademicSummaryDto,
  ClassAcademicReportDto,
} from '@ems/contracts';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  schoolId?: string | null;
}

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // 1. ASSESSMENT CATEGORIES
  // ===========================================================================

  async createCategory(
    user: AuthenticatedUser,
    dto: CreateAssessmentCategoryRequest,
  ): Promise<AssessmentCategoryDto> {
    const schoolId = this.resolveSchoolId(user, dto.schoolId);

    const category = await this.prisma.assessmentCategory.create({
      data: {
        schoolId,
        academicYearId: dto.academicYearId || null,
        subjectId: dto.subjectId || null,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        weightPercentage: dto.weightPercentage,
      },
      include: {
        academicYear: true,
        subject: true,
        _count: { select: { assessments: true } },
      },
    });

    return this.mapCategoryToDto(category);
  }

  async getCategories(
    user: AuthenticatedUser,
    schoolIdParam?: string,
    academicYearId?: string,
    subjectId?: string,
  ): Promise<AssessmentCategoryDto[]> {
    const schoolId = this.resolveSchoolId(user, schoolIdParam);

    const categories = await this.prisma.assessmentCategory.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        academicYear: true,
        subject: true,
        _count: { select: { assessments: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return categories.map((c) => this.mapCategoryToDto(c));
  }

  async updateCategory(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateAssessmentCategoryRequest,
  ): Promise<AssessmentCategoryDto> {
    const category = await this.prisma.assessmentCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Assessment category not found');
    this.assertSchoolAccess(user, category.schoolId);

    const updated = await this.prisma.assessmentCategory.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.weightPercentage !== undefined ? { weightPercentage: dto.weightPercentage } : {}),
        ...(dto.academicYearId !== undefined ? { academicYearId: dto.academicYearId || null } : {}),
        ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId || null } : {}),
      },
      include: {
        academicYear: true,
        subject: true,
        _count: { select: { assessments: true } },
      },
    });

    return this.mapCategoryToDto(updated);
  }

  async deleteCategory(user: AuthenticatedUser, id: string): Promise<{ success: boolean }> {
    const category = await this.prisma.assessmentCategory.findUnique({
      where: { id },
      include: { _count: { select: { assessments: true } } },
    });
    if (!category) throw new NotFoundException('Assessment category not found');
    this.assertSchoolAccess(user, category.schoolId);

    if (category._count.assessments > 0) {
      throw new BadRequestException(
        'Cannot delete category with associated active assessments. Reassign or remove assessments first.',
      );
    }

    await this.prisma.assessmentCategory.delete({ where: { id } });
    return { success: true };
  }

  // ===========================================================================
  // 2. ASSESSMENTS LIFECYCLE
  // ===========================================================================

  async createAssessment(
    user: AuthenticatedUser,
    dto: CreateAssessmentRequest,
  ): Promise<AssessmentDto> {
    const schoolId = this.resolveSchoolId(user, dto.schoolId);

    if (dto.maximumMarks <= 0) {
      throw new BadRequestException('maximumMarks must be greater than zero');
    }

    // Verify teacher assignment if author is a teacher
    if (user.role === UserRole.TEACHER) {
      await this.assertTeacherAssignment(user.id, dto.classSectionId, dto.subjectId);
    }

    // Verify category belongs to school
    const category = await this.prisma.assessmentCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || category.schoolId !== schoolId) {
      throw new BadRequestException('Selected category does not belong to authorized school');
    }

    const section = await this.prisma.classSection.findUnique({
      where: { id: dto.classSectionId },
    });
    const academicYearId = dto.academicYearId || section?.academicYearId;
    if (!academicYearId) {
      throw new BadRequestException('Academic year could not be resolved for selected class section');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        schoolId,
        academicYearId,
        classSectionId: dto.classSectionId,
        subjectId: dto.subjectId,
        categoryId: dto.categoryId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        maximumMarks: dto.maximumMarks,
        assessmentDate: dto.assessmentDate,
        createdById: user.id,
        status: AssessmentStatus.DRAFT,
      },
      include: {
        academicYear: true,
        classSection: { include: { schoolClass: true } },
        subject: true,
        category: true,
        createdBy: true,
        grades: true,
      },
    });

    return this.mapAssessmentToDto(assessment);
  }

  async getAssessments(
    user: AuthenticatedUser,
    query: {
      schoolId?: string;
      classSectionId?: string;
      subjectId?: string;
      academicYearId?: string;
      status?: string;
    },
  ): Promise<AssessmentDto[]> {
    const schoolId = this.resolveSchoolId(user, query.schoolId);

    // Students and Parents CANNOT view DRAFT assessments
    const isLearnerOrParent = user.role === UserRole.STUDENT || user.role === UserRole.PARENT;
    const statusFilter = isLearnerOrParent
      ? AssessmentStatus.PUBLISHED
      : query.status
      ? (query.status as AssessmentStatus)
      : undefined;

    const assessments = await this.prisma.assessment.findMany({
      where: {
        schoolId,
        ...(query.classSectionId ? { classSectionId: query.classSectionId } : {}),
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        academicYear: true,
        classSection: { include: { schoolClass: true } },
        subject: true,
        category: true,
        createdBy: true,
        grades: true,
      },
      orderBy: { assessmentDate: 'desc' },
    });

    return assessments.map((a) => this.mapAssessmentToDto(a));
  }

  async getAssessmentById(user: AuthenticatedUser, id: string): Promise<AssessmentDto> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        academicYear: true,
        classSection: { include: { schoolClass: true } },
        subject: true,
        category: true,
        createdBy: true,
        grades: true,
      },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');
    this.assertSchoolAccess(user, assessment.schoolId);

    if (
      (user.role === UserRole.STUDENT || user.role === UserRole.PARENT) &&
      assessment.status !== AssessmentStatus.PUBLISHED
    ) {
      throw new ForbiddenException('Access denied: assessment has not been published yet');
    }

    return this.mapAssessmentToDto(assessment);
  }

  async updateAssessment(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateAssessmentRequest,
  ): Promise<AssessmentDto> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    this.assertSchoolAccess(user, assessment.schoolId);

    if (user.role === UserRole.TEACHER) {
      await this.assertTeacherAssignment(user.id, assessment.classSectionId, assessment.subjectId);
    }

    if (dto.maximumMarks !== undefined && dto.maximumMarks <= 0) {
      throw new BadRequestException('maximumMarks must be greater than zero');
    }

    const updated = await this.prisma.assessment.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.maximumMarks !== undefined ? { maximumMarks: dto.maximumMarks } : {}),
        ...(dto.assessmentDate ? { assessmentDate: dto.assessmentDate } : {}),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      },
      include: {
        academicYear: true,
        classSection: { include: { schoolClass: true } },
        subject: true,
        category: true,
        createdBy: true,
        grades: true,
      },
    });

    return this.mapAssessmentToDto(updated);
  }

  async publishAssessment(user: AuthenticatedUser, id: string): Promise<AssessmentDto> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    this.assertSchoolAccess(user, assessment.schoolId);

    if (user.role === UserRole.TEACHER) {
      await this.assertTeacherAssignment(user.id, assessment.classSectionId, assessment.subjectId);
    }

    const updated = await this.prisma.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        academicYear: true,
        classSection: { include: { schoolClass: true } },
        subject: true,
        category: true,
        createdBy: true,
        grades: true,
      },
    });

    // Audited publication event
    await this.prisma.auditLog.create({
      data: {
        action: 'ASSESSMENT_PUBLISHED',
        entityType: 'Assessment',
        entityId: id,
        actorId: user.id,
        actorEmail: user.email,
        schoolId: assessment.schoolId,
        details: {
          title: assessment.title,
          publishedAt: new Date().toISOString(),
        },
      },
    });

    return this.mapAssessmentToDto(updated);
  }

  // ===========================================================================
  // 3. GRADEBOOK ENTRY (TEACHER / ADMIN REGISTER)
  // ===========================================================================

  async getAssessmentGradebook(
    user: AuthenticatedUser,
    assessmentId: string,
  ): Promise<AssessmentGradebookDto> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        academicYear: true,
        classSection: { include: { schoolClass: true } },
        subject: true,
        category: true,
        createdBy: true,
        grades: { include: { student: true } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    this.assertSchoolAccess(user, assessment.schoolId);

    if (user.role === UserRole.TEACHER) {
      await this.assertTeacherAssignment(user.id, assessment.classSectionId, assessment.subjectId);
    }

    // Retrieve active enrolled students in this class section
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: {
        sectionId: assessment.classSectionId,
        status: 'ACTIVE',
      },
      include: {
        student: { include: { studentProfile: true } },
      },
      orderBy: [
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });

    // Map existing grades by studentId
    const gradesMap = new Map<string, any>();
    for (const g of assessment.grades) {
      gradesMap.set(g.studentId, g);
    }

    let gradedCount = 0;
    let missingCount = 0;
    let marksSum = 0;
    let highestMarks: number | null = null;
    let lowestMarks: number | null = null;

    const studentRows: GradebookStudentRowDto[] = [];

    for (const enr of enrollments) {
      const g = gradesMap.get(enr.studentId);
      const marks = g ? g.marksObtained : null;
      let percentage: number | null = null;
      let letterGrade: string | null = null;

      if (marks !== null && marks !== undefined) {
        gradedCount++;
        marksSum += marks;
        if (highestMarks === null || marks > highestMarks) highestMarks = marks;
        if (lowestMarks === null || marks < lowestMarks) lowestMarks = marks;

        percentage = Math.round((marks / assessment.maximumMarks) * 1000) / 10;
        const scale = await this.resolveScale(assessment.schoolId, percentage);
        letterGrade = scale.letterGrade;
      } else {
        missingCount++;
      }

      studentRows.push({
        studentId: enr.student.id,
        studentName: `${enr.student.firstName} ${enr.student.lastName}`.trim(),
        admissionNumber: enr.student.studentProfile?.admissionNumber || enr.rollNumber || null,
        marksObtained: marks,
        percentage,
        letterGrade,
        feedback: g?.feedback || null,
      });
    }

    const averageMarks =
      gradedCount > 0 ? Math.round((marksSum / gradedCount) * 10) / 10 : null;
    const averagePercentage =
      gradedCount > 0
        ? Math.round(((marksSum / (gradedCount * assessment.maximumMarks)) * 100) * 10) / 10
        : null;

    return {
      assessment: this.mapAssessmentToDto(assessment),
      students: studentRows,
      statistics: {
        enrolledCount: enrollments.length,
        gradedCount,
        missingCount,
        averageMarks,
        averagePercentage,
        highestMarks,
        lowestMarks,
      },
    };
  }

  async bulkSaveGradebook(
    user: AuthenticatedUser,
    assessmentId: string,
    dto: BulkSaveGradebookRequest,
  ): Promise<AssessmentGradebookDto> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    this.assertSchoolAccess(user, assessment.schoolId);

    if (user.role === UserRole.TEACHER) {
      await this.assertTeacherAssignment(user.id, assessment.classSectionId, assessment.subjectId);
    }

    // 1. Reject duplicate student IDs in payload
    const studentIdSet = new Set<string>();
    for (const g of dto.grades) {
      if (studentIdSet.has(g.studentId)) {
        throw new BadRequestException(`Duplicate studentId [${g.studentId}] in grade entry payload`);
      }
      studentIdSet.add(g.studentId);
    }

    // 2. Validate all students belong to the authorized enrolled roster
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: {
        sectionId: assessment.classSectionId,
        studentId: { in: Array.from(studentIdSet) },
      },
    });

    if (enrollments.length !== studentIdSet.size) {
      throw new BadRequestException(
        'One or more students in payload are not actively enrolled in this class section',
      );
    }

    // 3. Validate marks range: 0 <= marksObtained <= maximumMarks
    for (const g of dto.grades) {
      if (g.marksObtained !== null && g.marksObtained !== undefined) {
        if (g.marksObtained < 0) {
          throw new BadRequestException(
            `marksObtained cannot be negative for student [${g.studentId}]`,
          );
        }
        if (g.marksObtained > assessment.maximumMarks) {
          throw new BadRequestException(
            `marksObtained (${g.marksObtained}) exceeds assessment maximumMarks (${assessment.maximumMarks}) for student [${g.studentId}]`,
          );
        }
      }
    }

    // 4. Atomic PostgreSQL Transaction
    await this.prisma.$transaction(async (tx) => {
      for (const g of dto.grades) {
        await tx.studentGrade.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId,
              studentId: g.studentId,
            },
          },
          update: {
            marksObtained: g.marksObtained ?? null,
            feedback: g.feedback?.trim() || null,
            gradedById: user.id,
            gradedAt: new Date(),
          },
          create: {
            assessmentId,
            studentId: g.studentId,
            marksObtained: g.marksObtained ?? null,
            feedback: g.feedback?.trim() || null,
            gradedById: user.id,
            gradedAt: new Date(),
          },
        });
      }

      // If assessment was already PUBLISHED, log an audit trail for grade adjustments
      if (assessment.status === AssessmentStatus.PUBLISHED) {
        await tx.auditLog.create({
          data: {
            action: 'PUBLISHED_GRADES_MODIFIED',
            entityType: 'Assessment',
            entityId: assessmentId,
            actorId: user.id,
            actorEmail: user.email,
            schoolId: assessment.schoolId,
            details: {
              studentsUpdated: dto.grades.length,
              timestamp: new Date().toISOString(),
            },
          },
        });
      }
    });

    return this.getAssessmentGradebook(user, assessmentId);
  }

  // ===========================================================================
  // 4. STUDENT & PARENT ACADEMIC RESULTS
  // ===========================================================================

  async getStudentAcademicSummary(
    user: AuthenticatedUser,
    studentId: string,
  ): Promise<StudentAcademicSummaryDto> {
    await this.assertStudentAccess(user, studentId);

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        studentProfile: true,
        classEnrollments: {
          where: { status: 'ACTIVE' },
          include: {
            section: { include: { schoolClass: true } },
          },
        },
      },
    });

    if (!student) throw new NotFoundException('Student profile not found');

    const activeEnrollment = student.classEnrollments[0];
    const className = activeEnrollment?.section?.schoolClass?.name || 'Class Unassigned';
    const sectionName = activeEnrollment?.section?.name || 'Section Unassigned';
    const schoolName = student.school?.name || 'Institutional Campus';

    // Query published assessments & grades for this student
    const studentGrades = await this.prisma.studentGrade.findMany({
      where: {
        studentId,
        assessment: {
          status: AssessmentStatus.PUBLISHED,
        },
      },
      include: {
        assessment: {
          include: {
            subject: true,
            category: true,
          },
        },
      },
      orderBy: {
        assessment: { assessmentDate: 'asc' },
      },
    });

    // Group grades by subject
    const subjectMap = new Map<
      string,
      {
        subjectId: string;
        subjectName: string;
        subjectCode: string;
        grades: typeof studentGrades;
      }
    >();

    for (const g of studentGrades) {
      const sub = g.assessment.subject;
      if (!subjectMap.has(sub.id)) {
        subjectMap.set(sub.id, {
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          grades: [],
        });
      }
      subjectMap.get(sub.id)!.grades.push(g);
    }

    const subjectPerformances: StudentSubjectPerformanceDto[] = [];
    const trendPoints: Array<{
      date: string;
      assessmentTitle: string;
      subjectCode: string;
      percentage: number;
    }> = [];

    let totalGpaPoints = 0;
    let subjectsWithGrades = 0;
    let totalPercentageSum = 0;

    for (const [, subData] of subjectMap.entries()) {
      // Group by category to apply weighted calculation
      const categoryMap = new Map<
        string,
        {
          categoryId: string;
          categoryName: string;
          weightPercentage: number;
          earnedMarks: number;
          possibleMarks: number;
        }
      >();

      const assessmentDetails: Array<any> = [];

      for (const g of subData.grades) {
        const cat = g.assessment.category;
        if (!categoryMap.has(cat.id)) {
          categoryMap.set(cat.id, {
            categoryId: cat.id,
            categoryName: cat.name,
            weightPercentage: cat.weightPercentage,
            earnedMarks: 0,
            possibleMarks: 0,
          });
        }

        const catRecord = categoryMap.get(cat.id)!;
        const marks = g.marksObtained;
        let pct: number | null = null;
        let letterGrade: string | null = null;

        if (marks !== null && marks !== undefined) {
          catRecord.earnedMarks += marks;
          catRecord.possibleMarks += g.assessment.maximumMarks;
          pct = Math.round((marks / g.assessment.maximumMarks) * 1000) / 10;
          const scale = await this.resolveScale(student.schoolId || '', pct);
          letterGrade = scale.letterGrade;

          trendPoints.push({
            date: g.assessment.assessmentDate,
            assessmentTitle: g.assessment.title,
            subjectCode: subData.subjectCode,
            percentage: pct,
          });
        }

        assessmentDetails.push({
          assessmentId: g.assessment.id,
          title: g.assessment.title,
          categoryName: cat.name,
          assessmentDate: g.assessment.assessmentDate,
          maximumMarks: g.assessment.maximumMarks,
          marksObtained: marks,
          percentage: pct,
          letterGrade,
          feedback: g.feedback,
        });
      }

      // Weighted calculation across categories
      let weightedSum = 0;
      let activeWeightSum = 0;
      const categoryBreakdown: Array<any> = [];

      for (const [catId, catInfo] of categoryMap.entries()) {
        const catPct =
          catInfo.possibleMarks > 0
            ? Math.round((catInfo.earnedMarks / catInfo.possibleMarks) * 1000) / 10
            : null;

        categoryBreakdown.push({
          categoryId: catId,
          categoryName: catInfo.categoryName,
          weightPercentage: catInfo.weightPercentage,
          averagePercentage: catPct,
        });

        if (catPct !== null) {
          weightedSum += (catPct * catInfo.weightPercentage) / 100;
          activeWeightSum += catInfo.weightPercentage;
        }
      }

      // Overall subject percentage
      let overallPercentage: number | null = null;
      let subjectLetter: string | null = null;
      let subjectGpa: number | null = null;

      if (activeWeightSum > 0) {
        // Normalize by active weights
        overallPercentage = Math.round((weightedSum / (activeWeightSum / 100)) * 10) / 10;
        const scale = await this.resolveScale(student.schoolId || '', overallPercentage);
        subjectLetter = scale.letterGrade;
        subjectGpa = scale.gradePoint ?? 0;

        totalPercentageSum += overallPercentage;
        totalGpaPoints += subjectGpa;
        subjectsWithGrades++;
      }

      subjectPerformances.push({
        subjectId: subData.subjectId,
        subjectName: subData.subjectName,
        subjectCode: subData.subjectCode,
        overallPercentage,
        letterGrade: subjectLetter,
        gradePoint: subjectGpa,
        completedAssessments: subData.grades.filter((g) => g.marksObtained !== null).length,
        totalAssessments: subData.grades.length,
        categoryBreakdown,
        assessments: assessmentDetails,
      });
    }

    const overallPct =
      subjectsWithGrades > 0
        ? Math.round((totalPercentageSum / subjectsWithGrades) * 10) / 10
        : null;
    const gpa =
      subjectsWithGrades > 0
        ? Math.round((totalGpaPoints / subjectsWithGrades) * 100) / 100
        : null;
    const scale = overallPct !== null ? await this.resolveScale(student.schoolId || '', overallPct) : null;

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      className,
      sectionName,
      schoolName,
      gpa,
      overallPercentage: overallPct,
      letterGrade: scale?.letterGrade || null,
      subjects: subjectPerformances,
      trend: trendPoints,
    };
  }

  async getStudentGrades(user: AuthenticatedUser, studentId: string): Promise<StudentGradeDto[]> {
    await this.assertStudentAccess(user, studentId);

    const grades = await this.prisma.studentGrade.findMany({
      where: {
        studentId,
        assessment: { status: AssessmentStatus.PUBLISHED },
      },
      include: {
        student: { include: { studentProfile: true } },
        assessment: { include: { category: true } },
        gradedBy: true,
      },
      orderBy: { assessment: { assessmentDate: 'desc' } },
    });

    const result: StudentGradeDto[] = [];
    for (const g of grades) {
      let pct: number | null = null;
      let letter: string | null = null;
      let gp: number | null = null;

      if (g.marksObtained !== null && g.marksObtained !== undefined) {
        pct = Math.round((g.marksObtained / g.assessment.maximumMarks) * 1000) / 10;
        const scale = await this.resolveScale(g.assessment.schoolId, pct);
        letter = scale.letterGrade;
        gp = scale.gradePoint ?? null;
      }

      result.push({
        id: g.id,
        assessmentId: g.assessmentId,
        studentId: g.studentId,
        studentName: `${g.student.firstName} ${g.student.lastName}`.trim(),
        studentAdmissionNumber: g.student.studentProfile?.admissionNumber || null,
        marksObtained: g.marksObtained,
        percentage: pct,
        letterGrade: letter,
        gradePoint: gp,
        feedback: g.feedback,
        gradedById: g.gradedById,
        gradedByName: `${g.gradedBy.firstName} ${g.gradedBy.lastName}`.trim(),
        gradedAt: g.gradedAt.toISOString(),
      });
    }

    return result;
  }

  // ===========================================================================
  // 5. CLASS PERFORMANCE & INSTITUTIONAL REPORTS
  // ===========================================================================

  async getClassPerformanceReport(
    user: AuthenticatedUser,
    classSectionId: string,
  ): Promise<ClassAcademicReportDto> {
    const section = await this.prisma.classSection.findUnique({
      where: { id: classSectionId },
      include: {
        schoolClass: { include: { school: true } },
        academicYear: true,
      },
    });

    if (!section) throw new NotFoundException('Class section not found');
    this.assertSchoolAccess(user, section.schoolClass.schoolId);

    // Retrieve active enrollments
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { sectionId: classSectionId, status: 'ACTIVE' },
      include: {
        student: { include: { studentProfile: true } },
      },
      orderBy: [
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });

    // Retrieve published assessments for this section
    const assessments = await this.prisma.assessment.findMany({
      where: {
        classSectionId,
        status: AssessmentStatus.PUBLISHED,
      },
      include: {
        subject: true,
        grades: true,
      },
    });

    // Subject performance breakdown
    const subjectStatsMap = new Map<
      string,
      {
        subjectId: string;
        subjectName: string;
        subjectCode: string;
        totalEarned: number;
        totalPossible: number;
        assessmentCount: number;
        gradedCount: number;
      }
    >();

    // Student performance summary map
    const studentEarnedMap = new Map<
      string,
      { earned: number; possible: number; student: (typeof enrollments)[0]['student'] }
    >();

    for (const enr of enrollments) {
      studentEarnedMap.set(enr.student.id, { earned: 0, possible: 0, student: enr.student });
    }

    for (const a of assessments) {
      if (!subjectStatsMap.has(a.subject.id)) {
        subjectStatsMap.set(a.subject.id, {
          subjectId: a.subject.id,
          subjectName: a.subject.name,
          subjectCode: a.subject.code,
          totalEarned: 0,
          totalPossible: 0,
          assessmentCount: 0,
          gradedCount: 0,
        });
      }
      const sStat = subjectStatsMap.get(a.subject.id)!;
      sStat.assessmentCount++;

      for (const g of a.grades) {
        if (g.marksObtained !== null && g.marksObtained !== undefined) {
          sStat.totalEarned += g.marksObtained;
          sStat.totalPossible += a.maximumMarks;
          sStat.gradedCount++;

          const sData = studentEarnedMap.get(g.studentId);
          if (sData) {
            sData.earned += g.marksObtained;
            sData.possible += a.maximumMarks;
          }
        }
      }
    }

    const subjectPerformance = Array.from(subjectStatsMap.values()).map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
      averagePercentage:
        s.totalPossible > 0
          ? Math.round((s.totalEarned / s.totalPossible) * 1000) / 10
          : 0,
      assessmentCount: s.assessmentCount,
      gradedCount: s.gradedCount,
    }));

    // Grade distribution counts
    const distributionMap = new Map<string, number>([
      ['A', 0],
      ['B', 0],
      ['C', 0],
      ['D', 0],
      ['F', 0],
    ]);

    const rankings: Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string | null;
      overallPercentage: number;
      letterGrade: string;
      rank: number;
    }> = [];

    for (const [sId, sRecord] of studentEarnedMap.entries()) {
      const pct =
        sRecord.possible > 0
          ? Math.round((sRecord.earned / sRecord.possible) * 1000) / 10
          : 0;

      const scale = await this.resolveScale(section.schoolClass.schoolId, pct);
      const letter = scale.letterGrade.charAt(0); // Bucket A+, A, A- into 'A'
      if (distributionMap.has(letter)) {
        distributionMap.set(letter, distributionMap.get(letter)! + 1);
      } else {
        distributionMap.set('F', (distributionMap.get('F') || 0) + 1);
      }

      rankings.push({
        studentId: sId,
        studentName: `${sRecord.student.firstName} ${sRecord.student.lastName}`.trim(),
        admissionNumber: sRecord.student.studentProfile?.admissionNumber || null,
        overallPercentage: pct,
        letterGrade: scale.letterGrade,
        rank: 0,
      });
    }

    // Sort by percentage descending
    rankings.sort((a, b) => b.overallPercentage - a.overallPercentage);
    rankings.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    const totalStudents = rankings.length;
    const gradeDistribution = Array.from(distributionMap.entries()).map(([letterGrade, count]) => ({
      letterGrade,
      count,
      percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
    }));

    return {
      classSectionId,
      className: section.schoolClass.name,
      sectionName: section.name,
      academicYearId: section.academicYearId,
      academicYearName: section.academicYear.name,
      subjectPerformance,
      gradeDistribution,
      studentRankings: rankings,
    };
  }

  async getReports(
    user: AuthenticatedUser,
    query: {
      schoolId?: string;
      classSectionId?: string;
      subjectId?: string;
      academicYearId?: string;
    },
  ): Promise<ClassAcademicReportDto> {
    if (query.classSectionId) {
      return this.getClassPerformanceReport(user, query.classSectionId);
    }
    const schoolId = this.resolveSchoolId(user, query.schoolId);
    const firstSection = await this.prisma.classSection.findFirst({
      where: {
        schoolClass: { schoolId },
      },
    });
    if (firstSection) {
      return this.getClassPerformanceReport(user, firstSection.id);
    }
    return {
      classSectionId: '',
      className: '',
      sectionName: '',
      academicYearId: '',
      academicYearName: '',
      subjectPerformance: [],
      gradeDistribution: [],
      studentRankings: [],
    };
  }

  // ===========================================================================
  // 6. GRADING SCALES
  // ===========================================================================

  async getGradingScales(user: AuthenticatedUser, schoolIdParam?: string): Promise<GradingScaleDto[]> {
    const schoolId = this.resolveSchoolId(user, schoolIdParam);

    const scales = await this.prisma.gradingScale.findMany({
      where: { schoolId },
      orderBy: { minimumPercentage: 'desc' },
    });

    return scales.map((s) => ({
      id: s.id,
      schoolId: s.schoolId,
      name: s.name,
      minimumPercentage: s.minimumPercentage,
      maximumPercentage: s.maximumPercentage,
      letterGrade: s.letterGrade,
      gradePoint: s.gradePoint,
      description: s.description,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async createGradingScale(
    user: AuthenticatedUser,
    dto: CreateGradingScaleRequest,
  ): Promise<GradingScaleDto> {
    const schoolId = this.resolveSchoolId(user, dto.schoolId);

    if (dto.minimumPercentage > dto.maximumPercentage) {
      throw new BadRequestException('minimumPercentage cannot be greater than maximumPercentage');
    }

    const scale = await this.prisma.gradingScale.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        minimumPercentage: dto.minimumPercentage,
        maximumPercentage: dto.maximumPercentage,
        letterGrade: dto.letterGrade.trim(),
        gradePoint: dto.gradePoint ?? null,
        description: dto.description?.trim() || null,
      },
    });

    return {
      id: scale.id,
      schoolId: scale.schoolId,
      name: scale.name,
      minimumPercentage: scale.minimumPercentage,
      maximumPercentage: scale.maximumPercentage,
      letterGrade: scale.letterGrade,
      gradePoint: scale.gradePoint,
      description: scale.description,
      createdAt: scale.createdAt.toISOString(),
      updatedAt: scale.updatedAt.toISOString(),
    };
  }

  async updateGradingScale(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateGradingScaleRequest,
  ): Promise<GradingScaleDto> {
    const scale = await this.prisma.gradingScale.findUnique({ where: { id } });
    if (!scale) throw new NotFoundException('Grading scale tier not found');
    this.assertSchoolAccess(user, scale.schoolId);

    const updated = await this.prisma.gradingScale.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.minimumPercentage !== undefined ? { minimumPercentage: dto.minimumPercentage } : {}),
        ...(dto.maximumPercentage !== undefined ? { maximumPercentage: dto.maximumPercentage } : {}),
        ...(dto.letterGrade ? { letterGrade: dto.letterGrade.trim() } : {}),
        ...(dto.gradePoint !== undefined ? { gradePoint: dto.gradePoint } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      },
    });

    return {
      id: updated.id,
      schoolId: updated.schoolId,
      name: updated.name,
      minimumPercentage: updated.minimumPercentage,
      maximumPercentage: updated.maximumPercentage,
      letterGrade: updated.letterGrade,
      gradePoint: updated.gradePoint,
      description: updated.description,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // ===========================================================================
  // 7. CALCULATION HELPER
  // ===========================================================================

  async resolveScale(
    schoolId: string,
    percentage: number,
  ): Promise<{ letterGrade: string; gradePoint: number | null }> {
    if (schoolId) {
      const match = await this.prisma.gradingScale.findFirst({
        where: {
          schoolId,
          minimumPercentage: { lte: percentage },
          maximumPercentage: { gte: percentage },
        },
        orderBy: { minimumPercentage: 'desc' },
      });

      if (match) {
        return {
          letterGrade: match.letterGrade,
          gradePoint: match.gradePoint,
        };
      }
    }

    // Default Institutional Standard Scale
    if (percentage >= 93) return { letterGrade: 'A', gradePoint: 4.0 };
    if (percentage >= 90) return { letterGrade: 'A-', gradePoint: 3.7 };
    if (percentage >= 87) return { letterGrade: 'B+', gradePoint: 3.3 };
    if (percentage >= 83) return { letterGrade: 'B', gradePoint: 3.0 };
    if (percentage >= 80) return { letterGrade: 'B-', gradePoint: 2.7 };
    if (percentage >= 77) return { letterGrade: 'C+', gradePoint: 2.3 };
    if (percentage >= 73) return { letterGrade: 'C', gradePoint: 2.0 };
    if (percentage >= 70) return { letterGrade: 'C-', gradePoint: 1.7 };
    if (percentage >= 60) return { letterGrade: 'D', gradePoint: 1.0 };
    return { letterGrade: 'F', gradePoint: 0.0 };
  }

  // ===========================================================================
  // 8. SECURITY & TENANT AUTHORIZATION
  // ===========================================================================

  private resolveSchoolId(user: AuthenticatedUser, requestedSchoolId?: string): string {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      if (requestedSchoolId) return requestedSchoolId;
      if (user.schoolId) return user.schoolId;
      throw new BadRequestException('schoolId parameter is required for Platform Administrator');
    }

    if (!user.schoolId) {
      throw new ForbiddenException('User is not assigned to an active school institution');
    }

    if (requestedSchoolId && requestedSchoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school unauthorized institution access denied');
    }

    return user.schoolId;
  }

  private assertSchoolAccess(user: AuthenticatedUser, resourceSchoolId: string): void {
    if (user.role === UserRole.PLATFORM_ADMIN) return;
    if (user.schoolId !== resourceSchoolId) {
      throw new ForbiddenException('Cross-school unauthorized access denied');
    }
  }

  private async assertTeacherAssignment(
    teacherId: string,
    sectionId: string,
    subjectId: string,
  ): Promise<void> {
    const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
      where: {
        teacherId,
        sectionId,
        subjectId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'Teacher is not actively assigned to instruct this subject in this class section',
      );
    }
  }

  private async assertStudentAccess(user: AuthenticatedUser, targetStudentId: string): Promise<void> {
    if (user.role === UserRole.PLATFORM_ADMIN) return;

    if (user.role === UserRole.STUDENT) {
      if (user.id !== targetStudentId) {
        throw new ForbiddenException('Students can view only their own academic results');
      }
      return;
    }

    if (user.role === UserRole.PARENT) {
      // Must be a verified linked guardian relationship
      const relationship = await this.prisma.studentGuardianRelationship.findFirst({
        where: {
          guardianId: user.id,
          studentId: targetStudentId,
          verificationStatus: RelationshipVerificationStatus.VERIFIED,
        },
      });

      if (!relationship) {
        throw new ForbiddenException(
          'Access denied: You do not have an active verified guardian relationship with this student',
        );
      }
      return;
    }

    // School Admins and Teachers must match the student's school
    const student = await this.prisma.user.findUnique({
      where: { id: targetStudentId },
      select: { schoolId: true },
    });

    if (!student || student.schoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school student access denied');
    }
  }

  // ===========================================================================
  // 9. DTO MAPPERS
  // ===========================================================================

  private mapCategoryToDto(c: any): AssessmentCategoryDto {
    return {
      id: c.id,
      schoolId: c.schoolId,
      academicYearId: c.academicYearId,
      academicYearName: c.academicYear?.name || null,
      subjectId: c.subjectId,
      subjectName: c.subject?.name || null,
      name: c.name,
      description: c.description,
      weightPercentage: c.weightPercentage,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      assessmentsCount: c._count?.assessments ?? 0,
    };
  }

  private mapAssessmentToDto(a: any): AssessmentDto {
    const grades = a.grades || [];
    const gradedCount = grades.filter(
      (g: any) => g.marksObtained !== null && g.marksObtained !== undefined,
    ).length;
    const totalMarks = grades.reduce(
      (acc: number, g: any) => acc + (g.marksObtained ?? 0),
      0,
    );
    const avgMarks = gradedCount > 0 ? Math.round((totalMarks / gradedCount) * 10) / 10 : null;
    const avgPct =
      avgMarks !== null && a.maximumMarks > 0
        ? Math.round((avgMarks / a.maximumMarks) * 1000) / 10
        : null;

    return {
      id: a.id,
      schoolId: a.schoolId,
      academicYearId: a.academicYearId,
      academicYearName: a.academicYear?.name || '',
      classSectionId: a.classSectionId,
      className: a.classSection?.schoolClass?.name || '',
      sectionName: a.classSection?.name || '',
      subjectId: a.subjectId,
      subjectName: a.subject?.name || '',
      subjectCode: a.subject?.code || '',
      categoryId: a.categoryId,
      categoryName: a.category?.name || '',
      categoryWeight: a.category?.weightPercentage || 0,
      title: a.title,
      description: a.description,
      maximumMarks: a.maximumMarks,
      assessmentDate: a.assessmentDate,
      createdById: a.createdById,
      createdByName: a.createdBy ? `${a.createdBy.firstName} ${a.createdBy.lastName}`.trim() : '',
      status: a.status,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      enrolledStudentsCount: grades.length,
      gradedStudentsCount: gradedCount,
      averageMarks: avgMarks,
      averagePercentage: avgPct,
    };
  }
}
