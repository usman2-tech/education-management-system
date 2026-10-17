/**
 * MODULE: Course Management - DTOs
 *
 * PURPOSE:
 * Input validation contracts for courses, modules, lessons, student enrollments,
 * and lesson completion tracking.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateCourseDto {
  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsUUID()
  @IsOptional()
  subjectId?: string;
}

export class CreateCourseModuleDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class CreateCourseLessonDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  attachments?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsNumber()
  @Min(1)
  @Max(600)
  @IsOptional()
  durationMinutes?: number;
}

export class CourseFilterQueryDto {
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}
