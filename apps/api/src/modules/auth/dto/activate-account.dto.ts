/**
 * MODULE: Authentication - Account Activation DTO
 *
 * PURPOSE:
 * Validates invited user password establishment and profile details.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ActivateAccountDto {
  @ApiProperty({
    description: 'Cryptographically secure one-time activation token',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString({ message: 'Token must be a string.' })
  @IsNotEmpty({ message: 'Activation token is required.' })
  token!: string;

  @ApiProperty({
    description: 'New password for the activated account',
    example: 'SecurePassword123!',
  })
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must contain at least 8 characters.' })
  password!: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'Sarah',
  })
  @IsString({ message: 'First name must be a string.' })
  @IsNotEmpty({ message: 'First name is required.' })
  firstName!: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Miller',
  })
  @IsString({ message: 'Last name must be a string.' })
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName!: string;
}
