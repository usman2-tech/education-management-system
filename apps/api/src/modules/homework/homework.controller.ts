/**
 * MODULE: Homework & Learning Content - REST Controller
 *
 * PURPOSE:
 * Exposes endpoints for homework creation, submissions, grading, parent visibility,
 * and completion statistics.
 *
 * SECURITY:
 * Guarded by JwtAuthGuard and RolesGuard.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  CreateHomeworkDto,
  UpdateHomeworkDto,
  SubmitHomeworkDto,
  GradeHomeworkSubmissionDto,
  HomeworkFilterQueryDto,
} from './dto/homework.dto';

@Controller('homework')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHomeworkDto) {
    return this.homeworkService.createHomework(user as any, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: HomeworkFilterQueryDto) {
    return this.homeworkService.getHomeworks(user as any, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.homeworkService.getHomeworkById(user as any, id);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateHomeworkDto,
  ) {
    return this.homeworkService.updateHomework(user as any, id, dto);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitHomeworkDto,
  ) {
    return this.homeworkService.submitHomework(user as any, id, dto);
  }

  @Post('submissions/:submissionId/grade')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  grade(
    @CurrentUser() user: AuthUser,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeHomeworkSubmissionDto,
  ) {
    return this.homeworkService.gradeSubmission(user as any, submissionId, dto);
  }

  @Get('students/:studentId')
  findStudentHomeworks(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.homeworkService.getStudentHomeworks(user as any, studentId);
  }

  @Get('classes/:classSectionId/stats')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  getClassStats(
    @CurrentUser() user: AuthUser,
    @Param('classSectionId') classSectionId: string,
  ) {
    return this.homeworkService.getClassHomeworkStats(user as any, classSectionId);
  }
}
