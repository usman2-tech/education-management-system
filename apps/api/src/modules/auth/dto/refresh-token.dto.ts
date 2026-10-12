/**
 * MODULE: Authentication - Refresh Token DTO
 *
 * PURPOSE:
 * Validates inbound refresh token requests.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Cryptographic refresh token string',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh token must be a string.' })
  @IsNotEmpty({ message: 'Refresh token is required.' })
  refreshToken!: string;
}
