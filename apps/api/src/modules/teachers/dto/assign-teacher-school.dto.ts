/**
 * MODULE: Teacher Management - Assign Teacher to School DTO
 *
 * PURPOSE:
 * Validates payload for associating an existing teacher with a school.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger, @ems/contracts
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AssignTeacherSchoolRequest } from '@ems/contracts';

export class AssignTeacherSchoolDto implements AssignTeacherSchoolRequest {
  @ApiProperty({
    description: 'Target School UUID to assign teacher to',
    example: 'bea1204c-0bd0-4daa-b25e-b65ce01c27cb',
  })
  @IsUUID('4', { message: 'A valid School UUID is required.' })
  @IsNotEmpty({ message: 'School ID cannot be empty.' })
  schoolId!: string;

  @ApiPropertyOptional({
    description: 'School-scoped employee code for the teacher at target school',
    example: 'TCH-STJ-302',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeCode?: string;
}
