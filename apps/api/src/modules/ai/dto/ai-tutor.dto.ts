import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, Min, Max, IsObject } from 'class-validator';

export class ConceptExplanationRequestDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsNotEmpty()
  @IsString()
  topic!: string;

  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @IsOptional()
  @IsString()
  explanationStyle?: string;

  @IsOptional()
  @IsString()
  question?: string;
}

export class SocraticTutorMessageDto {
  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class GeneratePracticeQuizRequestDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsNotEmpty()
  @IsString()
  topic!: string;

  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(20)
  questionCount?: number;

  @IsOptional()
  @IsString()
  questionType?: string;
}

export class SubmitPracticeQuizRequestDto {
  @IsNotEmpty()
  @IsString()
  quizId!: string;

  @IsNotEmpty()
  @IsObject()
  answers!: Record<string, any>;
}

export class GenerateRevisionPlanRequestDto {
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(60)
  timeframeDays?: number;

  @IsOptional()
  @IsArray()
  focusSubjects?: string[];

  @IsOptional()
  @IsString()
  targetExamDate?: string;
}

export class SaveRevisionPlanRequestDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsNotEmpty()
  @IsObject()
  planContent!: Record<string, any>;
}

export class HomeworkGuidanceRequestDto {
  @IsNotEmpty()
  @IsString()
  homeworkId!: string;

  @IsOptional()
  @IsString()
  questionOrDoubt?: string;
}
