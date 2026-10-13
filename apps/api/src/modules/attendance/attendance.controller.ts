/**
 * MODULE: Attendance Management - Controller
 *
 * PURPOSE:
 * Exposes REST endpoints for attendance registers, bulk marking,
 * individual student histories, class summaries, reports, and NFC simulation.
 *
 * DEPENDENCIES:
 * AttendanceService, JwtAuthGuard, RolesGuard, Roles, CurrentUser
 *
 * SECURITY:
 * RBAC authorization applied to all endpoints. School isolation enforced.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole, AttendanceSessionStatus } from '@ems/contracts';
import {
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
  BulkMarkAttendanceDto,
  AttendanceReportFilterDto,
  ProvisionNFCIdentityDto,
  NFCScanDto,
} from './dto/attendance.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ---------------------------------------------------------------------------
  // ATTENDANCE SESSIONS
  // ---------------------------------------------------------------------------

  @Post('sessions')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async createSession(
    @Body() dto: CreateAttendanceSessionDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.attendanceService.createSession(dto, currentUser);
  }

  @Get('sessions')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getSessions(
    @CurrentUser() currentUser: AuthUser,
    @Query('schoolId') schoolId?: string,
    @Query('classSectionId') classSectionId?: string,
    @Query('date') date?: string,
    @Query('status') status?: AttendanceSessionStatus,
  ) {
    return this.attendanceService.getSessions(currentUser, {
      schoolId,
      classSectionId,
      date,
      status,
    });
  }

  @Get('sessions/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getSessionById(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.attendanceService.getSessionById(id, currentUser);
  }

  @Patch('sessions/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async updateSession(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceSessionDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.attendanceService.updateSession(id, dto, currentUser);
  }

  @Post('sessions/:id/finalize')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async finalizeSession(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.attendanceService.finalizeSession(id, currentUser);
  }

  // ---------------------------------------------------------------------------
  // ATTENDANCE RECORDS (BULK MARKING & ATOMIC REGISTER UPDATES)
  // ---------------------------------------------------------------------------

  @Put('sessions/:id/records')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async bulkMarkRecords(
    @Param('id') id: string,
    @Body() dto: BulkMarkAttendanceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.attendanceService.bulkMarkRecords(id, dto, currentUser);
  }

  @Get('students/:studentId')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  async getStudentAttendance(
    @Param('studentId') studentId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.attendanceService.getStudentAttendance(studentId, currentUser);
  }

  @Get('classes/:classSectionId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getClassAttendance(
    @Param('classSectionId') classSectionId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.attendanceService.getClassAttendance(classSectionId, currentUser);
  }

  @Get('reports')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getAttendanceReports(
    @CurrentUser() currentUser: AuthUser,
    @Query() filters: AttendanceReportFilterDto,
  ) {
    return this.attendanceService.getAttendanceReports(currentUser, filters);
  }

  // ---------------------------------------------------------------------------
  // NFC IDENTITY & SCAN SIMULATION
  // ---------------------------------------------------------------------------

  @Post('nfc/identities')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async provisionNFCIdentity(
    @Body() dto: ProvisionNFCIdentityDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.attendanceService.provisionNFCIdentity(dto, currentUser);
  }

  @Post('nfc/scan')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async scanNFC(
    @Body() dto: NFCScanDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.attendanceService.scanNFC(dto, currentUser);
  }

  @Get('nfc/events')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getNFCEvents(
    @CurrentUser() currentUser: AuthUser,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.attendanceService.getNFCEvents(currentUser, sessionId);
  }
}
