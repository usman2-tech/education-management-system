/**
 * MODULE: AI Tool Query DTOs
 *
 * PURPOSE:
 * Strongly-typed request envelope for internal service-to-service tool queries.
 *
 * SECURITY:
 * Requires verified principal context (userId, role, schoolId) derived from authenticated sessions.
 */

import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { UserRole } from '@ems/contracts';

export class ExecuteAIToolDto {
  @IsString()
  @IsNotEmpty()
  toolName!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsObject()
  args?: Record<string, any>;
}
