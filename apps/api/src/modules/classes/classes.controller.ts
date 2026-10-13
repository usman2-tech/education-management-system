/**
 * MODULE: Classes & Timetables - Classes Controller
 *
 * PURPOSE:
 * Exposes REST endpoints for academic years, classes, sections, subjects,
 * enrollments, teacher assignments, and timetable scheduling.
 *
 * DEPENDENCIES:
 * ClassesService, JwtAuthGuard, RolesGuard, CurrentUser decorator
 *
 * SECURITY:
 * RBAC authorization applied to all endpoints. School isolation enforced.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
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
} from './dto/classes.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // ---------------------------------------------------------------------------
  // ACADEMIC YEARS
  // ---------------------------------------------------------------------------

  @Post('academic-years')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createAcademicYear(
    @Body() dto: CreateAcademicYearDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.createAcademicYear(dto, currentUser);
  }

  @Get('academic-years')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getAcademicYears(
    @CurrentUser() currentUser: AuthUser,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.classesService.getAcademicYears(currentUser, schoolId);
  }

  @Put('academic-years/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateAcademicYear(
    @Param('id') id: string,
    @Body() dto: UpdateAcademicYearDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.updateAcademicYear(id, dto, currentUser);
  }

  // ---------------------------------------------------------------------------
  // CLASSES & SECTIONS
  // ---------------------------------------------------------------------------

  @Post('classes')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createClass(
    @Body() dto: CreateSchoolClassDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.createClass(dto, currentUser);
  }

  @Get('classes')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getClasses(
    @CurrentUser() currentUser: AuthUser,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.classesService.getClasses(currentUser, schoolId);
  }

  @Get('classes/sections')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getSections(
    @CurrentUser() currentUser: AuthUser,
    @Query('academicYearId') academicYearId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.classesService.getSections(academicYearId, classId, currentUser);
  }

  @Get('classes/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getClassById(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.getClassById(id, currentUser);
  }

  @Put('classes/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateClass(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolClassDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.updateClass(id, dto, currentUser);
  }

  @Post('classes/sections')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createSection(
    @Body() dto: CreateClassSectionDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.createSection(dto, currentUser);
  }

  @Put('classes/sections/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateClassSectionDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.updateSection(id, dto, currentUser);
  }

  // ---------------------------------------------------------------------------
  // ENROLLMENTS & TEACHER ASSIGNMENTS
  // ---------------------------------------------------------------------------

  @Post('classes/sections/:id/enroll')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async enrollStudent(
    @Param('id') sectionId: string,
    @Body() dto: EnrollStudentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.enrollStudent(sectionId, dto, currentUser);
  }

  @Get('classes/sections/:id/enrollments')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getSectionEnrollments(
    @Param('id') sectionId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.getSectionEnrollments(sectionId, currentUser);
  }

  @Delete('classes/sections/:id/enrollments/:studentId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async removeStudentEnrollment(
    @Param('id') sectionId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.removeStudentEnrollment(sectionId, studentId, currentUser);
  }

  @Post('classes/sections/:id/assign-teacher')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async assignTeacherToSubject(
    @Param('id') sectionId: string,
    @Body() dto: AssignTeacherSubjectDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.assignTeacherToSubject(sectionId, dto, currentUser);
  }

  @Get('classes/sections/:id/teacher-assignments')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getSectionTeacherAssignments(
    @Param('id') sectionId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.getSectionTeacherAssignments(sectionId, currentUser);
  }

  // ---------------------------------------------------------------------------
  // SUBJECTS
  // ---------------------------------------------------------------------------

  @Post('subjects')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createSubject(
    @Body() dto: CreateSubjectDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.createSubject(dto, currentUser);
  }

  @Get('subjects')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getSubjects(
    @CurrentUser() currentUser: AuthUser,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.classesService.getSubjects(currentUser, schoolId);
  }

  @Put('subjects/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateSubject(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.updateSubject(id, dto, currentUser);
  }

  // ---------------------------------------------------------------------------
  // TIMETABLES & SCHEDULES
  // ---------------------------------------------------------------------------

  @Post('timetable')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createTimetableEntry(
    @Body() dto: CreateTimetableEntryDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.createTimetableEntry(dto, currentUser);
  }

  @Put('timetable/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateTimetableEntry(
    @Param('id') id: string,
    @Body() dto: UpdateTimetableEntryDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.updateTimetableEntry(id, dto, currentUser);
  }

  @Delete('timetable/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async deleteTimetableEntry(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.deleteTimetableEntry(id, currentUser);
  }

  @Get('timetable/section/:sectionId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getSectionTimetable(
    @Param('sectionId') sectionId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.getSectionTimetable(sectionId, currentUser);
  }

  @Get('timetable/teacher/:teacherId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getTeacherTimetable(
    @Param('teacherId') teacherId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.getTeacherTimetable(teacherId, currentUser);
  }

  @Get('timetable/student/:studentId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.STUDENT)
  async getStudentTimetable(
    @Param('studentId') studentId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.getStudentTimetable(studentId, currentUser);
  }

  @Get('timetable/child/:childId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)
  async getChildTimetable(
    @Param('childId') childId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.classesService.getChildTimetable(childId, currentUser);
  }
}
