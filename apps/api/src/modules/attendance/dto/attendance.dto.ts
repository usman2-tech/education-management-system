/**
 * MODULE: Attendance Management - DTOs
 *
 * PURPOSE:
 * Input validation contracts for attendance sessions, atomic bulk record
 * marking, student attendance reports, and NFC identity provisioning/scanning.
 *
 * SECURITY:
 * Strict validation with class-validator.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsUUID,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AttendanceStatus,
  AttendanceSessionType,
} from '@ems/contracts';

export class CreateAttendanceSessionDto {
  @IsUUID()
  @IsNotEmpty()
  classSectionId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'attendanceDate must be in YYYY-MM-DD format',
  })
  attendanceDate!: string;

  @IsEnum(AttendanceSessionType)
  @IsOptional()
  sessionType?: AttendanceSessionType;

  @IsUUID()
  @IsOptional()
  timetableEntryId?: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;
}

export class UpdateAttendanceSessionDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'attendanceDate must be in YYYY-MM-DD format',
  })
  attendanceDate?: string;

  @IsUUID()
  @IsOptional()
  timetableEntryId?: string;
}

export class BulkMarkAttendanceItemDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status!: AttendanceStatus;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BulkMarkAttendanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMarkAttendanceItemDto)
  records!: BulkMarkAttendanceItemDto[];
}

export class FinalizeAttendanceSessionDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AttendanceReportFilterDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  classSectionId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

export class ProvisionNFCIdentityDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  cardToken!: string;
}

export class NFCScanDto {
  @IsUUID()
  @IsNotEmpty()
  attendanceSessionId!: string;

  @IsString()
  @IsNotEmpty()
  cardToken!: string;
}
