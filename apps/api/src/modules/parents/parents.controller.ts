/**
 * MODULE: Parent & Guardian Management - Parents Controller
 *
 * PURPOSE:
 * Exposes REST endpoints for guardian account registration, directory queries,
 * student linkages, relationship verifications, and parent dashboard analytics.
 *
 * DEPENDENCIES:
 * ParentsService, JwtAuthGuard, RolesGuard, Roles, CurrentUser
 *
 * SECURITY:
 * Role-guarded. School isolation strictly enforced.
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
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import {
  CreateParentDto,
  UpdateParentDto,
  LinkStudentDto,
  VerifyRelationshipDto,
  ParentQueryDto,
} from './dto/parent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';

@ApiTags('Parent & Guardian Management')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new parent or legal guardian' })
  async createParent(
    @Body() dto: CreateParentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parentsService.createParent(dto, user);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'List parents directory with student relationships' })
  async getParents(
    @Query() query: ParentQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parentsService.getParents(query, user);
  }

  @Get('me')
  @Roles(UserRole.PARENT, UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Retrieve authenticated parent own profile' })
  async getCurrentParentProfile(@CurrentUser() user: AuthUser) {
    return this.parentsService.getCurrentParentProfile(user);
  }

  @Get('dashboard')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Retrieve parent portal dashboard data and verified children' })
  async getParentDashboard(@CurrentUser() user: AuthUser) {
    return this.parentsService.getParentDashboard(user);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)
  @ApiOperation({ summary: 'Retrieve detailed parent profile' })
  @ApiParam({ name: 'id', description: 'Parent User UUID' })
  async getParentById(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parentsService.getParentById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)
  @ApiOperation({ summary: 'Update parent personal details' })
  @ApiParam({ name: 'id', description: 'Parent User UUID' })
  async updateParent(
    @Param('id') id: string,
    @Body() dto: UpdateParentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parentsService.updateParent(id, dto, user);
  }

  @Post(':id/students')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Link parent/guardian to an enrolled student' })
  @ApiParam({ name: 'id', description: 'Parent User UUID' })
  async linkStudent(
    @Param('id') id: string,
    @Body() dto: LinkStudentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parentsService.linkStudent(id, dto, user);
  }

  @Patch(':id/students/:studentId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Verify or revoke student-guardian relationship' })
  @ApiParam({ name: 'id', description: 'Parent User UUID' })
  @ApiParam({ name: 'studentId', description: 'Student User UUID' })
  async verifyRelationship(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: VerifyRelationshipDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.parentsService.verifyRelationship(id, studentId, dto, user);
  }
}
