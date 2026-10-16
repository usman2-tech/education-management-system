import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ParentChildQueryDto {
  @IsNotEmpty()
  @IsString()
  studentId!: string;
}

export class ParentAskQuestionDto {
  @IsNotEmpty()
  @IsString()
  studentId!: string;

  @IsNotEmpty()
  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  topic?: string;
}

export class ParentHomeLearningRequestDto {
  @IsNotEmpty()
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  focusArea?: string;
}
