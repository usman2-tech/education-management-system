/**
 * MODULE: Teacher Management - Update Teacher DTO
 *
 * PURPOSE:
 * Validates updates to teacher personal and professional profile details.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger, @ems/contracts
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UpdateTeacherRequest } from '@ems/contracts';

export class UpdateTeacherDto implements UpdateTeacherRequest {
  @ApiPropertyOptional({
    description: 'Updated legal first name',
    example: 'Sarah',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Updated legal last name',
    example: 'Jenkins-Miller',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Updated direct contact phone number',
    example: '+1-555-019-9944',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Updated highest qualification',
    example: 'Ph.D. in Chemistry, M.Ed. in Secondary Pedagogy',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  qualification?: string;

  @ApiPropertyOptional({
    description: 'Updated academic specialization',
    example: 'Biochemistry and STEM AP Curriculum',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  specialization?: string;

  @ApiPropertyOptional({
    description: 'Updated residential address',
    example: '880 Academic Way, Apt 4B, Seattle, WA',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Updated faculty biography',
    example: 'Experienced Chemistry department head with extensive AP instruction credentials.',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Updated employee identifier code',
    example: 'TCH-2041-A',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeCode?: string;

  @ApiPropertyOptional({
    description: 'Updated joining date',
    example: '2026-09-01T00:00:00.00Z',
  })
  @IsOptional()
  @IsString()
  joiningDate?: string;
}
