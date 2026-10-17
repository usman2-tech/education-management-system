/**
 * MODULE: Exam Management - DTOs
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
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExamStatus, ExamQuestionType } from '@prisma/client';

export class CreateExamQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText!: string;

  @IsEnum(ExamQuestionType)
  questionType!: ExamQuestionType;

  @IsArray()
  @IsOptional()
  options?: string[];

  @IsString()
  @IsOptional()
  correctAnswer?: string;

  @IsNumber()
  @Min(0.5)
  @Max(100)
  marks!: number;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class CreateExamDto {
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
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  examDate!: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsNumber()
  @Min(5)
  @Max(480)
  durationMinutes!: number;

  @IsNumber()
  @Min(1)
  @Max(1000)
  totalMarks!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  passingMarks?: number;

  @IsEnum(ExamStatus)
  @IsOptional()
  status?: ExamStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamQuestionDto)
  @IsOptional()
  questions?: CreateExamQuestionDto[];
}

export class UpdateExamDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  examDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsNumber()
  @Min(5)
  @Max(480)
  @IsOptional()
  durationMinutes?: number;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  totalMarks?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  passingMarks?: number;

  @IsEnum(ExamStatus)
  @IsOptional()
  status?: ExamStatus;
}

export class SubmitExamAnswerItemDto {
  @IsUUID()
  @IsNotEmpty()
  questionId!: string;

  @IsString()
  answerText!: string;
}

export class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitExamAnswerItemDto)
  answers!: SubmitExamAnswerItemDto[];
}

export class GradeExamItemDto {
  @IsUUID()
  @IsNotEmpty()
  questionId!: string;

  @IsNumber()
  @Min(0)
  awardedMarks!: number;

  @IsString()
  @IsOptional()
  teacherFeedback?: string;
}

export class GradeExamAttemptDto {
  @IsString()
  @IsOptional()
  feedback?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeExamItemDto)
  grades!: GradeExamItemDto[];
}

export class ExamFilterQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  classSectionId?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsEnum(ExamStatus)
  @IsOptional()
  status?: ExamStatus;
}
