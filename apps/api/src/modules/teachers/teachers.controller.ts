/**
 * MODULE: Teacher Management - Teachers Controller
 *
 * PURPOSE:
 * Exposes REST API endpoints for teacher account provisioning, directory queries,
 * profile modifications, multi-school affiliation, and teacher self-service.
 *
 * DEPENDENCIES:
 * TeachersService, JwtAuthGuard, RolesGuard, Roles, CurrentUser
 *
 * SECURITY:
 * Bearer JWT required. Role-guarded. School Administrators are strictly
 * restricted to their institutional tenant. Teachers can only access self-service endpoints.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { UpdateTeacherStatusDto } from './dto/update-teacher-status.dto';
import { AssignTeacherSchoolDto } from './dto/assign-teacher-school.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';

@ApiTags('Teacher Management')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Onboard a new teacher into an authorized school tenant' })
  @ApiResponse({ status: 201, description: 'Teacher successfully onboarded.' })
  @ApiResponse({ status: 400, description: 'Validation failed or school inactive.' })
  @ApiResponse({ status: 403, description: 'Cross-tenant access forbidden.' })
  @ApiResponse({ status: 409, description: 'Duplicate email or employee code.' })
  async createTeacher(
    @Body() dto: CreateTeacherDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teachersService.createTeacher(dto, user);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'List teachers directory with search, filtering, and school isolation' })
  @ApiResponse({ status: 200, description: 'Paginated teacher records retrieved.' })
  async getTeachers(
    @Query() query: TeacherQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teachersService.getTeachers(query, user);
  }

  @Get('me')
  @Roles(UserRole.TEACHER, UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Retrieve authenticated teacher self-service profile and memberships' })
  @ApiResponse({ status: 200, description: 'Authenticated teacher profile retrieved.' })
  async getCurrentTeacherProfile(@CurrentUser() user: AuthUser) {
    return this.teachersService.getCurrentTeacherProfile(user);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Retrieve detailed teacher record with qualifications and school affiliations' })
  @ApiParam({ name: 'id', description: 'Teacher User UUID' })
  @ApiResponse({ status: 200, description: 'Teacher profile retrieved.' })
  @ApiResponse({ status: 403, description: 'Forbidden: teacher outside authorized school.' })
  @ApiResponse({ status: 404, description: 'Teacher not found.' })
  async getTeacherById(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teachersService.getTeacherById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update teacher details, qualifications, or bio' })
  @ApiParam({ name: 'id', description: 'Teacher User UUID' })
  @ApiResponse({ status: 200, description: 'Teacher successfully updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden from altering employee code or unauthorized profile.' })
  @ApiResponse({ status: 409, description: 'Employee code conflict.' })
  async updateTeacher(
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teachersService.updateTeacher(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Activate, deactivate, or toggle employment status for a teacher' })
  @ApiParam({ name: 'id', description: 'Teacher User UUID' })
  @ApiResponse({ status: 200, description: 'Teacher status modified.' })
  @ApiResponse({ status: 403, description: 'Unauthorized to modify status.' })
  async updateTeacherStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTeacherStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teachersService.updateTeacherStatus(id, dto, user);
  }

  @Post(':id/schools')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Associate an existing teacher with another institutional school tenant' })
  @ApiParam({ name: 'id', description: 'Teacher User UUID' })
  @ApiResponse({ status: 200, description: 'Teacher assigned to school.' })
  @ApiResponse({ status: 403, description: 'Unauthorized cross-school assignment.' })
  @ApiResponse({ status: 409, description: 'Duplicate employee code or membership.' })
  async assignTeacherToSchool(
    @Param('id') id: string,
    @Body() dto: AssignTeacherSchoolDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teachersService.assignTeacherToSchool(id, dto, user);
  }
}
