/**
 * MODULE: Institutional Grades & Academic Performance Controller
 *
 * PURPOSE:
 * Exposes versioned REST endpoints for assessment categories, assessment definitions,
 * atomic bulk gradebook marking, student/parent published results, class performance reports,
 * and school grading scale tier management.
 *
 * DEPENDENCIES:
 * GradesService, JwtAuthGuard, RolesGuard, Roles, CurrentUser
 *
 * SECURITY:
 * Multi-tenant school isolation and RBAC enforced across all routes.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GradesService } from './grades.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  CreateAssessmentCategoryDto,
  UpdateAssessmentCategoryDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  BulkSaveGradebookDto,
  CreateGradingScaleDto,
  UpdateGradingScaleDto,
  GradesFilterQueryDto,
} from './dto/grades.dto';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  // ---------------------------------------------------------------------------
  // 1. ASSESSMENT CATEGORIES
  // ---------------------------------------------------------------------------

  @Get('categories')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  async getCategories(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.gradesService.getCategories(user, schoolId, academicYearId, subjectId);
  }

  @Post('categories')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssessmentCategoryDto,
  ) {
    return this.gradesService.createCategory(user, dto);
  }

  @Patch('categories/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentCategoryDto,
  ) {
    return this.gradesService.updateCategory(user, id, dto);
  }

  @Delete('categories/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async deleteCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gradesService.deleteCategory(user, id);
  }

  // ---------------------------------------------------------------------------
  // 2. ASSESSMENTS
  // ---------------------------------------------------------------------------

  @Get('assessments')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  async getAssessments(
    @CurrentUser() user: AuthUser,
    @Query() query: GradesFilterQueryDto,
  ) {
    return this.gradesService.getAssessments(user, query);
  }

  @Post('assessments')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async createAssessment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.gradesService.createAssessment(user, dto);
  }

  @Get('assessments/:id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  async getAssessmentById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.gradesService.getAssessmentById(user, id);
  }

  @Patch('assessments/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async updateAssessment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.gradesService.updateAssessment(user, id, dto);
  }

  @Post('assessments/:id/publish')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async publishAssessment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.gradesService.publishAssessment(user, id);
  }

  // ---------------------------------------------------------------------------
  // 3. GRADE ENTRY & GRADEBOOK
  // ---------------------------------------------------------------------------

  @Get('assessments/:id/gradebook')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getAssessmentGradebook(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.gradesService.getAssessmentGradebook(user, id);
  }

  @Put('assessments/:id/gradebook')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async bulkSaveGradebook(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: BulkSaveGradebookDto,
  ) {
    return this.gradesService.bulkSaveGradebook(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 4. STUDENT & PARENT RESULTS
  // ---------------------------------------------------------------------------

  @Get('students/:studentId')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  async getStudentGrades(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.gradesService.getStudentGrades(user, studentId);
  }

  @Get('students/:studentId/summary')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  async getStudentAcademicSummary(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.gradesService.getStudentAcademicSummary(user, studentId);
  }

  // ---------------------------------------------------------------------------
  // 5. CLASS PERFORMANCE & INSTITUTIONAL REPORTS
  // ---------------------------------------------------------------------------

  @Get('classes/:classSectionId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getClassPerformanceReport(
    @CurrentUser() user: AuthUser,
    @Param('classSectionId') classSectionId: string,
  ) {
    return this.gradesService.getClassPerformanceReport(user, classSectionId);
  }

  @Get('reports')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getReports(
    @CurrentUser() user: AuthUser,
    @Query() query: GradesFilterQueryDto,
  ) {
    return this.gradesService.getReports(user, query);
  }

  // ---------------------------------------------------------------------------
  // 6. GRADING SCALES
  // ---------------------------------------------------------------------------

  @Get('scales')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  async getGradingScales(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.gradesService.getGradingScales(user, schoolId);
  }

  @Post('scales')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createGradingScale(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGradingScaleDto,
  ) {
    return this.gradesService.createGradingScale(user, dto);
  }

  @Patch('scales/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateGradingScale(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateGradingScaleDto,
  ) {
    return this.gradesService.updateGradingScale(user, id, dto);
  }
}
