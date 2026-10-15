/**
 * MODULE: Authentication - Login DTO
 *
 * PURPOSE:
 * Validates inbound login credentials using class-validator.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '@ems/contracts';

export class LoginDto {
  @ApiProperty({
    description: 'Institutional user email address',
    example: 'admin@stjude.ems.local',
  })
  @IsEmail({}, { message: 'Invalid institutional email address format.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
  })
  @IsString({ message: 'Password must be a string.' })
  @MinLength(6, { message: 'Password must contain at least 6 characters.' })
  password!: string;

  @ApiProperty({
    description: 'Selected portal role for authentication verification',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Selected role must be a valid institutional UserRole.' })
  selectedRole?: UserRole;
}
