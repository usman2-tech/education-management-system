/**
 * MODULE: Authentication - User Invitation DTO
 *
 * PURPOSE:
 * Validates administrator invitation requests for controlled onboarding.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger, @ems/contracts
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UserRole } from '@ems/contracts';

export class InviteUserDto {
  @ApiProperty({
    description: 'Target user email address for institutional invitation',
    example: 'new.teacher@stjude.ems.local',
  })
  @IsEmail({}, { message: 'Invalid institutional email address format.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email!: string;

  @ApiProperty({
    description: 'Assigned institutional role',
    enum: UserRole,
    example: UserRole.TEACHER,
  })
  @IsEnum(UserRole, { message: 'Role must be a valid institutional UserRole.' })
  @IsNotEmpty({ message: 'Role is required.' })
  role!: UserRole;

  @ApiProperty({
    description: 'Assigned school ID (required for non-Platform Admins)',
    required: false,
    example: '268de511-db14-48cd-a6dd-155304949aa2',
  })
  @IsOptional()
  @IsUUID('4', { message: 'School ID must be a valid UUIDv4.' })
  schoolId?: string;

  @ApiProperty({
    description: 'Optional first name of invitee',
    required: false,
    example: 'John',
  })
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'Optional last name of invitee',
    required: false,
    example: 'Smith',
  })
  @IsOptional()
  lastName?: string;
}
