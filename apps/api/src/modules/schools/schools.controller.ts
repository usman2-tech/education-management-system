/**
 * MODULE: School Management - Schools Controller
 *
 * PURPOSE:
 * Exposes REST endpoints for institutional multi-school management:
 * registration, search, school updates, status toggling, and administrator assignment.
 *
 * DEPENDENCIES:
 * SchoolsService, JwtAuthGuard, RolesGuard, Roles, CurrentUser
 *
 * SECURITY:
 * All endpoints require Bearer JWT. Platform Admin has global institutional authority;
 * School Admins are strictly scoped to their assigned institution.
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
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSchoolStatusDto } from './dto/update-school-status.dto';
import { AssignSchoolAdminDto } from './dto/assign-admin.dto';
import { SchoolQueryDto } from './dto/school-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';

@ApiTags('School Management')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new institutional school tenant (Platform Admin only)' })
  @ApiResponse({ status: 201, description: 'School tenant successfully registered.' })
  @ApiResponse({ status: 409, description: 'School code already exists.' })
  async createSchool(
    @Body() dto: CreateSchoolDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.schoolsService.createSchool(dto, actor);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Retrieve schools list (Platform Admin: all; School Admin: assigned only)' })
  @ApiResponse({ status: 200, description: 'Paginated schools retrieved.' })
  async findAll(
    @Query() query: SchoolQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.schoolsService.findAll(query, actor);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiParam({ name: 'id', description: 'School UUID' })
  @ApiOperation({ summary: 'Retrieve school details by ID' })
  @ApiResponse({ status: 200, description: 'School details retrieved.' })
  @ApiResponse({ status: 403, description: 'Access denied for other school tenants.' })
  @ApiResponse({ status: 404, description: 'School not found.' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.schoolsService.findById(id, actor);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiParam({ name: 'id', description: 'School UUID' })
  @ApiOperation({ summary: 'Update school profile information' })
  @ApiResponse({ status: 200, description: 'School profile updated successfully.' })
  @ApiResponse({ status: 403, description: 'Unauthorized to modify this institution.' })
  async updateSchool(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.schoolsService.updateSchool(id, dto, actor);
  }

  @Patch(':id/status')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiParam({ name: 'id', description: 'School UUID' })
  @ApiOperation({ summary: 'Activate or deactivate a school tenant (Platform Admin only)' })
  @ApiResponse({ status: 200, description: 'School status updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Platform Admin only.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.schoolsService.updateStatus(id, dto.status, actor);
  }

  @Post(':id/administrators')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiParam({ name: 'id', description: 'School UUID' })
  @ApiOperation({ summary: 'Assign an existing user as School Administrator (Platform Admin only)' })
  @ApiResponse({ status: 201, description: 'User successfully assigned as School Administrator.' })
  async assignAdministrator(
    @Param('id') id: string,
    @Body() dto: AssignSchoolAdminDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.schoolsService.assignAdministrator(schoolIdFromParam(id), dto.userId, actor);
  }

  @Get(':id/administrators')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiParam({ name: 'id', description: 'School UUID' })
  @ApiOperation({ summary: 'List administrators assigned to a school' })
  @ApiResponse({ status: 200, description: 'School administrators retrieved.' })
  async getAdministrators(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.schoolsService.getAdministrators(id, actor);
  }
}

function schoolIdFromParam(id: string): string {
  return id;
}
