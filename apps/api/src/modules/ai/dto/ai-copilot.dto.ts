import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, Min, Max } from 'class-validator';
import { AICopilotDraftStatus } from '@ems/contracts';

export class GenerateLessonPlanRequestDto {
  @IsNotEmpty()
  @IsString()
  classSectionId!: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsNotEmpty()
  @IsString()
  topic!: string;

  @IsNotEmpty()
  @IsString()
  learningObjectives!: string;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(180)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class GenerateHomeworkRequestDto {
  @IsNotEmpty()
  @IsString()
  classSectionId!: string;

  @IsNotEmpty()
  @IsString()
  subjectId!: string;

  @IsNotEmpty()
  @IsString()
  topic!: string;

  @IsOptional()
  @IsString()
  learningObjectives?: string;

  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  questionCount?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class GenerateExamRequestDto {
  @IsNotEmpty()
  @IsString()
  classSectionId!: string;

  @IsNotEmpty()
  @IsString()
  subjectId!: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsNotEmpty()
  @IsString()
  topic!: string;

  @IsOptional()
  @IsArray()
  questionTypes?: string[];

  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(30)
  questionCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  totalMarks?: number;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(240)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class GenerateGradingRequestDto {
  @IsNotEmpty()
  @IsString()
  submissionId!: string;

  @IsOptional()
  @IsString()
  rubricCriteria?: string;

  @IsOptional()
  @IsString()
  markingGuide?: string;
}

export class GeneratePerformanceInsightRequestDto {
  @IsNotEmpty()
  @IsString()
  classSectionId!: string;

  @IsOptional()
  @IsString()
  subjectId?: string;
}

export class GenerateTeachingMaterialRequestDto {
  @IsOptional()
  @IsString()
  classSectionId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsNotEmpty()
  @IsString()
  materialType!: string;

  @IsNotEmpty()
  @IsString()
  topic!: string;

  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @IsOptional()
  @IsString()
  length?: string;

  @IsOptional()
  @IsString()
  learningObjectives?: string;
}

export class UpdateCopilotDraftRequestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  content?: any;

  @IsOptional()
  @IsEnum(AICopilotDraftStatus)
  status?: AICopilotDraftStatus;
}

export class ApproveAndPublishRequestDto {
  @IsNotEmpty()
  @IsString()
  targetStatus!: 'APPROVED' | 'PUBLISHED';

  @IsOptional()
  @IsNumber()
  confirmedScore?: number;

  @IsOptional()
  @IsString()
  teacherFeedback?: string;

  @IsOptional()
  publishOptions?: {
    dueDate?: string;
    examDate?: string;
    maxPoints?: number;
    totalMarks?: number;
    passingMarks?: number;
    teacherConfirmedScore?: number;
    teacherConfirmedFeedback?: string;
  };
}
