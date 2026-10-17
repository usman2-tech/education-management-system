/**
 * MODULE: Classes & Timetables - DTOs
 *
 * PURPOSE:
 * Input validation contracts for academic years, classes, sections, subjects,
 * student enrollments, teacher assignments, and timetable scheduling.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  Max,
  Matches,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAcademicYearDto {
  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  startDate!: string; // ISO date string

  @IsString()
  @IsNotEmpty()
  endDate!: string; // ISO date string

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class UpdateAcademicYearDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class CreateSchoolClassDto {
  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  order?: number;
}

export class UpdateSchoolClassDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  order?: number;
}

export class CreateClassSectionDto {
  @IsUUID()
  @IsNotEmpty()
  classId!: string;

  @IsUUID()
  @IsNotEmpty()
  academicYearId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  capacity?: number;

  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsUUID()
  @IsOptional()
  classTeacherId?: string;
}

export class UpdateClassSectionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  capacity?: number;

  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsUUID()
  @IsOptional()
  classTeacherId?: string;
}

export class CreateSubjectDto {
  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsNumber()
  @Min(0.5)
  @IsOptional()
  @Type(() => Number)
  credits?: number;
}

export class UpdateSubjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsNumber()
  @Min(0.5)
  @IsOptional()
  @Type(() => Number)
  credits?: number;
}

export class EnrollStudentDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsOptional()
  rollNumber?: string;
}

export class AssignTeacherSubjectDto {
  @IsUUID()
  @IsNotEmpty()
  teacherId!: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;
}

export class CreateTimetableEntryDto {
  @IsUUID()
  @IsNotEmpty()
  sectionId!: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;

  @IsUUID()
  @IsNotEmpty()
  teacherId!: string;

  @IsUUID()
  @IsNotEmpty()
  academicYearId!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  @Type(() => Number)
  dayOfWeek!: number;

  @IsString()
  @IsNotEmpty()
  periodName!: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in format HH:mm (e.g. 08:30)',
  })
  startTime!: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in format HH:mm (e.g. 09:20)',
  })
  endTime!: string;

  @IsString()
  @IsOptional()
  roomNumber?: string;
}

export class UpdateTimetableEntryDto {
  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  @Type(() => Number)
  dayOfWeek?: number;

  @IsString()
  @IsOptional()
  periodName?: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in format HH:mm (e.g. 08:30)',
  })
  @IsOptional()
  startTime?: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in format HH:mm (e.g. 09:20)',
  })
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  roomNumber?: string;
}

export class TimetableFilterDto {
  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  @Type(() => Number)
  dayOfWeek?: number;

  @IsUUID()
  @IsOptional()
  schoolId?: string;
}

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  admissionNumber?: string;

  @IsString()
  @IsOptional()
  gradeLevel?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  photoBase64?: string;
}

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  admissionNumber?: string;

  @IsString()
  @IsOptional()
  gradeLevel?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @IsString()
  @IsOptional()
  photoBase64?: string | null;
}
