/**
 * MODULE: School Management - Create School DTO
 *
 * PURPOSE:
 * Validates inbound school creation payload for Platform Administrators.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty({
    description: 'Full official name of the institution',
    example: 'St. Jude Institutional Academy',
  })
  @IsString()
  @IsNotEmpty({ message: 'School name is required.' })
  @MinLength(3, { message: 'School name must be at least 3 characters.' })
  @MaxLength(150, { message: 'School name cannot exceed 150 characters.' })
  name!: string;

  @ApiProperty({
    description: 'Unique institutional code or slug (lowercase alphanumeric and hyphens)',
    example: 'st-jude',
  })
  @IsString()
  @IsNotEmpty({ message: 'School code is required.' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'School code must consist of lowercase letters, numbers, and hyphens only.',
  })
  @MinLength(2, { message: 'School code must be at least 2 characters.' })
  @MaxLength(50, { message: 'School code cannot exceed 50 characters.' })
  code!: string;

  @ApiPropertyOptional({
    description: 'Custom academic domain or website',
    example: 'stjude.ems.local',
  })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({
    description: 'Campus physical street address',
    example: '100 Institutional Boulevard, Academic District',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'City where the campus is situated',
    example: 'Metropolis',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'NY',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'USA',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Official campus logo URL',
    example: '/assets/crests/st-jude.png',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Primary administrative telephone number',
    example: '+1-555-019-2831',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Primary administrative email',
    example: 'admissions@stjude.ems.local',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid administrative email address.' })
  email?: string;
}
