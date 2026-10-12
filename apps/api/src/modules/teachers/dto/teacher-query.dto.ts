/**
 * MODULE: Teacher Management - Teacher Query DTO
 *
 * PURPOSE:
 * Validates pagination, search, and filtering parameters for teacher directory queries.
 *
 * DEPENDENCIES:
 * class-validator, class-transformer, @nestjs/swagger, @ems/contracts
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TeacherListQuery } from '@ems/contracts';

export class TeacherQueryDto implements TeacherListQuery {
  @ApiPropertyOptional({
    description: 'Page number for pagination (1-indexed)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer.' })
  @Min(1, { message: 'Page must be at least 1.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page (max: 100)',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  @Max(100, { message: 'Limit cannot exceed 100.' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term filtering by teacher name, email, or employee code',
    example: 'Marcus',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter teachers by specific school UUID (Platform Admin only; ignored for School Admin)',
    example: 'bea1204c-0bd0-4daa-b25e-b65ce01c27cb',
  })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'Filter teachers by active status or employment status',
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
