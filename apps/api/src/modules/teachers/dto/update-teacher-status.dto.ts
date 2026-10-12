/**
 * MODULE: Teacher Management - Update Teacher Status DTO
 *
 * PURPOSE:
 * Validates teacher account activation / deactivation and employment status transitions.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger, @ems/contracts
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TeacherEmploymentStatus, UpdateTeacherStatusRequest } from '@ems/contracts';

export class UpdateTeacherStatusDto implements UpdateTeacherStatusRequest {
  @ApiPropertyOptional({
    description: 'Whether the teacher user account is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Teacher institutional employment status',
    enum: TeacherEmploymentStatus,
    example: TeacherEmploymentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(TeacherEmploymentStatus, {
    message: 'Employment status must be ACTIVE, ON_LEAVE, SUSPENDED, or TERMINATED.',
  })
  employmentStatus?: TeacherEmploymentStatus;

  @ApiPropertyOptional({
    description: 'Specific school ID if toggling membership status within a secondary school',
    example: 'bea1204c-0bd0-4daa-b25e-b65ce01c27cb',
  })
  @IsOptional()
  @IsUUID('4', { message: 'School ID must be a valid UUID.' })
  schoolId?: string;
}
