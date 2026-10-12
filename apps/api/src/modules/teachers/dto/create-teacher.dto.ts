/**
 * MODULE: Teacher Management - Create Teacher DTO
 *
 * PURPOSE:
 * Validates inbound teacher account & profile creation requests.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger, @ems/contracts
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { CreateTeacherRequest } from '@ems/contracts';

export class CreateTeacherDto implements CreateTeacherRequest {
  @ApiProperty({
    description: 'Teacher institutional or personal email address',
    example: 'sarah.jenkins@stjude.ems.local',
  })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email!: string;

  @ApiPropertyOptional({
    description: 'Initial login password (defaults to standard institutional temp password if omitted)',
    example: 'Password123!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password?: string;

  @ApiProperty({
    description: 'Teacher legal first name',
    example: 'Sarah',
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  @MaxLength(60)
  firstName!: string;

  @ApiProperty({
    description: 'Teacher legal last name',
    example: 'Jenkins',
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  @MaxLength(60)
  lastName!: string;

  @ApiPropertyOptional({
    description: 'Institutional School UUID (Required for Platform Admin; auto-assigned for School Admin)',
    example: 'bea1204c-0bd0-4daa-b25e-b65ce01c27cb',
  })
  @IsOptional()
  @IsUUID('4', { message: 'School ID must be a valid UUID.' })
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'School-scoped teacher employee identifier code',
    example: 'TCH-2041',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeCode?: string;

  @ApiPropertyOptional({
    description: 'Academic degree or highest professional qualification',
    example: 'Ph.D. in Organic Chemistry',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  qualification?: string;

  @ApiPropertyOptional({
    description: 'Primary academic discipline or instructional specialization',
    example: 'Advanced Physical Sciences & Organic Chemistry',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  specialization?: string;

  @ApiPropertyOptional({
    description: 'Teacher direct contact phone number',
    example: '+1-555-019-4421',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Teacher physical residential address',
    example: '742 Evergreen Terrace, Seattle, WA',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Short professional biography or faculty summary',
    example: 'Senior secondary science educator with 8 years of honors AP curriculum expertise.',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Institutional onboarding or employment start date (ISO string)',
    example: '2026-09-01T00:00:00.00Z',
  })
  @IsOptional()
  @IsString()
  joiningDate?: string;
}
