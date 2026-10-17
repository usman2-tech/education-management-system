/**
 * MODULE: Course Management - REST Controller
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
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateCourseModuleDto,
  CreateCourseLessonDto,
  CourseFilterQueryDto,
} from './dto/courses.dto';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(user as any, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: CourseFilterQueryDto) {
    return this.coursesService.getCourses(user as any, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coursesService.getCourseById(user as any, id);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.updateCourse(user as any, id, dto);
  }

  @Post(':id/modules')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  createModule(
    @CurrentUser() user: AuthUser,
    @Param('id') courseId: string,
    @Body() dto: CreateCourseModuleDto,
  ) {
    return this.coursesService.createModule(user as any, courseId, dto);
  }

  @Post('modules/:moduleId/lessons')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  createLesson(
    @CurrentUser() user: AuthUser,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateCourseLessonDto,
  ) {
    return this.coursesService.createLesson(user as any, moduleId, dto);
  }

  @Post(':id/enroll')
  @Roles(UserRole.STUDENT)
  enroll(@CurrentUser() user: AuthUser, @Param('id') courseId: string) {
    return this.coursesService.enrollCourse(user as any, courseId);
  }

  @Post('lessons/:lessonId/complete')
  @Roles(UserRole.STUDENT)
  completeLesson(@CurrentUser() user: AuthUser, @Param('lessonId') lessonId: string) {
    return this.coursesService.completeLesson(user as any, lessonId);
  }

  @Get('students/:studentId')
  findStudentCourses(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.coursesService.getStudentCourses(user as any, studentId);
  }
}
