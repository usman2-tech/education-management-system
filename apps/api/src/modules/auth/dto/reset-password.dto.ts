/**
 * MODULE: Authentication - Reset Password DTO
 *
 * PURPOSE:
 * Validates new password and reset token submission.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Cryptographically secure one-time password reset token',
    example: 'b7c8d9e0...',
  })
  @IsString({ message: 'Token must be a string.' })
  @IsNotEmpty({ message: 'Reset token is required.' })
  token!: string;

  @ApiProperty({
    description: 'New password meeting complexity requirements',
    example: 'NewSecurePassword123!',
  })
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must contain at least 8 characters.' })
  password!: string;
}
