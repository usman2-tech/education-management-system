/**
 * MODULE: Exam Management - REST Controller
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
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  CreateExamDto,
  UpdateExamDto,
  SubmitExamDto,
  GradeExamAttemptDto,
  ExamFilterQueryDto,
} from './dto/exams.dto';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExamDto) {
    return this.examsService.createExam(user as any, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ExamFilterQueryDto) {
    return this.examsService.getExams(user as any, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.examsService.getExamById(user as any, id);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.examsService.updateExam(user as any, id, dto);
  }

  @Post(':id/start')
  @Roles(UserRole.STUDENT)
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.examsService.startExam(user as any, id);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitExamDto,
  ) {
    return this.examsService.submitExam(user as any, id, dto);
  }

  @Post('attempts/:attemptId/grade')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  grade(
    @CurrentUser() user: AuthUser,
    @Param('attemptId') attemptId: string,
    @Body() dto: GradeExamAttemptDto,
  ) {
    return this.examsService.gradeAttempt(user as any, attemptId, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  publishResults(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.examsService.publishResults(user as any, id);
  }

  @Get('students/:studentId')
  findStudentExams(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.examsService.getStudentExams(user as any, studentId);
  }
}
