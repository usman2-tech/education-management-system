/**
 * MODULE: School Management - Update School Status DTO
 *
 * PURPOSE:
 * Validates status transitions (ACTIVE, INACTIVE, SUSPENDED).
 *
 * DEPENDENCIES:
 * class-validator, @prisma/client, @nestjs/swagger
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { SchoolStatus } from '@ems/contracts';

export class UpdateSchoolStatusDto {
  @ApiProperty({
    description: 'Updated operational status of the institution',
    enum: SchoolStatus,
    example: SchoolStatus.ACTIVE,
  })
  @IsEnum(SchoolStatus, {
    message: 'Status must be one of: ACTIVE, PENDING_VERIFICATION, SUSPENDED, INACTIVE.',
  })
  @IsNotEmpty({ message: 'Status is required.' })
  status!: SchoolStatus;
}
