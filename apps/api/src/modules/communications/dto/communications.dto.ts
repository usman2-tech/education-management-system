/**
 * MODULE: Communications & Notifications - DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { NotificationType, UserRole } from '@prisma/client';

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsString()
  @IsOptional()
  link?: string;

  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class PreviewAnnouncementDto {
  @IsEnum(UserRole)
  @IsOptional()
  targetRole?: UserRole;

  @IsUUID()
  @IsOptional()
  classSectionId?: string;
}

export class BroadcastAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsEnum(UserRole)
  @IsOptional()
  targetRole?: UserRole; // If null, broadcasts to entire school or specified class

  @IsUUID()
  @IsOptional()
  classSectionId?: string;

  @IsString()
  @IsOptional()
  link?: string;
}

export class CreateConversationDto {
  @IsUUID()
  @IsNotEmpty()
  recipientId!: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  initialMessage!: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class UpdateNotificationPreferenceDto {
  @IsBoolean()
  @IsOptional()
  absenceAlertsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  attendanceCorrectionAlertsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  homeworkAlertsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  feeAlertsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  transportAlertsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  libraryAlertsEnabled?: boolean;
}
