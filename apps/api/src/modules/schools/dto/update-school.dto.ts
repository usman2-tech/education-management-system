/**
 * MODULE: School Management - Update School DTO
 *
 * PURPOSE:
 * Validates updates to school profile attributes.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateSchoolDto {
  @ApiPropertyOptional({
    description: 'Official name of the institution',
    example: 'St. Jude Institutional Academy',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name?: string;

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
