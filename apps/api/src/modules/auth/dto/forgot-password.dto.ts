/**
 * MODULE: Authentication - Forgot Password DTO
 *
 * PURPOSE:
 * Validates inbound password recovery reset request.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Registered institutional email address',
    example: 'teacher@stjude.ems.local',
  })
  @IsEmail({}, { message: 'Invalid institutional email address format.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email!: string;
}
