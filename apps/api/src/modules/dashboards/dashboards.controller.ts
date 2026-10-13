/**
 * MODULE: Dashboards Controller
 *
 * PURPOSE:
 * Exposes role-authorized institutional dashboard data for Platform Admin,
 * School Admin, Faculty, Students, and Verified Parents.
 *
 * DEPENDENCIES:
 * DashboardsService, JwtAuthGuard, RolesGuard, Roles decorator
 *
 * SECURITY:
 * Strict RBAC guards, school context enforcement, and zero data fabrication.
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardsService } from './dashboards.service';
import { AuthUser, UserRole } from '@ems/contracts';

@ApiTags('Dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('platform-admin')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Platform Administrator multi-tenant overview & metrics' })
  async getPlatformAdminDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboardsService.getPlatformAdminDashboard(user);
  }

  @Get('school-admin')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'School Administrator campus analytics & operations' })
  @ApiQuery({ name: 'schoolId', required: false, description: 'Optional school ID filter for Platform Admin' })
  async getSchoolAdminDashboard(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.dashboardsService.getSchoolAdminDashboard(user, schoolId);
  }

  @Get('teacher')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Teacher workspace agenda, schedule, and pending tasks' })
  async getTeacherDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboardsService.getTeacherDashboard(user);
  }

  @Get('student')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Student learning dashboard, courses, and deadlines' })
  async getStudentDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboardsService.getStudentDashboard(user);
  }

  @Get('parent')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Parent family portal, child switcher, and verified academic progress' })
  @ApiQuery({ name: 'childId', required: false, description: 'Selected child student ID' })
  async getParentDashboard(
    @CurrentUser() user: AuthUser,
    @Query('childId') childId?: string,
  ) {
    return this.dashboardsService.getParentDashboard(user, childId);
  }
}
