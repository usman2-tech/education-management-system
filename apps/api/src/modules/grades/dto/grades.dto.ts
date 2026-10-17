/**
 * MODULE: Grades & Academic Performance - DTOs
 *
 * PURPOSE:
 * Input validation contracts for assessment categories, assessment definitions,
 * atomic bulk grade entry, grading scales, and report filters.
 *
 * SECURITY:
 * Strict validation with class-validator.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUUID,
  Matches,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssessmentCategoryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  weightPercentage!: number;
}

export class UpdateAssessmentCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  weightPercentage?: number;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;
}

export class CreateAssessmentDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsNotEmpty()
  academicYearId!: string;

  @IsUUID()
  @IsNotEmpty()
  classSectionId!: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  maximumMarks!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'assessmentDate must be in YYYY-MM-DD format',
  })
  assessmentDate!: string;
}

export class UpdateAssessmentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maximumMarks?: number;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'assessmentDate must be in YYYY-MM-DD format',
  })
  assessmentDate?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;
}

export class GradeEntryItemDto {
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  marksObtained?: number | null; // Nullable to denote missing grade!

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class BulkSaveGradebookDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeEntryItemDto)
  grades!: GradeEntryItemDto[];
}

export class CreateGradingScaleDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  minimumPercentage!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  maximumPercentage!: number;

  @IsString()
  @IsNotEmpty()
  letterGrade!: string;

  @IsNumber()
  @IsOptional()
  gradePoint?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateGradingScaleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minimumPercentage?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maximumPercentage?: number;

  @IsString()
  @IsOptional()
  letterGrade?: string;

  @IsNumber()
  @IsOptional()
  gradePoint?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class GradesFilterQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  classSectionId?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
