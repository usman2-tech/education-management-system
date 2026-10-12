/**
 * MODULE: School Management - School Query DTO
 *
 * PURPOSE:
 * Validates search, status filtering, and pagination parameters for school listings.
 *
 * DEPENDENCIES:
 * class-validator, class-transformer, @prisma/client, @nestjs/swagger
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SchoolStatus } from '@ems/contracts';

export class SchoolQueryDto {
  @ApiPropertyOptional({
    description: 'Current page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of schools per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Search keyword matching school name, code, or city',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by school operational status',
    enum: SchoolStatus,
  })
  @IsOptional()
  @IsEnum(SchoolStatus)
  status?: SchoolStatus;
}
