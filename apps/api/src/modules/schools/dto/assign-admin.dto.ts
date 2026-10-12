/**
 * MODULE: School Management - Assign Administrator DTO
 *
 * PURPOSE:
 * Validates request to assign an existing user as School Administrator.
 *
 * DEPENDENCIES:
 * class-validator, @nestjs/swagger
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignSchoolAdminDto {
  @ApiProperty({
    description: 'UUID of the eligible user to appoint as School Administrator',
    example: '268de511-db14-48cd-a6dd-155304949aa2',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID v4.' })
  @IsNotEmpty({ message: 'userId is required.' })
  userId!: string;
}
