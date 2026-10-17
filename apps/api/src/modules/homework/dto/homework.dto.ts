/**
 * MODULE: Homework & Learning Content - DTOs
 *
 * PURPOSE:
 * Input validation contracts for homework assignments, student submissions,
 * teacher review & grading, and query filtering.
 *
 * SECURITY:
 * Parameter validation via class-validator and class-transformer.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { HomeworkStatus } from '@prisma/client';

export class CreateHomeworkDto {
  @IsUUID()
  @IsNotEmpty()
  classSectionId!: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  instructions!: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate!: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxPoints?: number;

  @IsEnum(HomeworkStatus)
  @IsOptional()
  status?: HomeworkStatus;

  @IsString()
  @IsOptional()
  attachments?: string;
}

export class UpdateHomeworkDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxPoints?: number;

  @IsEnum(HomeworkStatus)
  @IsOptional()
  status?: HomeworkStatus;

  @IsString()
  @IsOptional()
  attachments?: string;
}

export class SubmitHomeworkDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  attachments?: string;
}

export class GradeHomeworkSubmissionDto {
  @IsNumber()
  @Min(0)
  grade!: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class HomeworkFilterQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  classSectionId?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsEnum(HomeworkStatus)
  @IsOptional()
  status?: HomeworkStatus;

  @IsUUID()
  @IsOptional()
  teacherId?: string;
}
