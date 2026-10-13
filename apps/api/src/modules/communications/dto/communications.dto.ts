/**
 * MODULE: Communications & Notifications - DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
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
  targetRole?: UserRole; // If null, broadcasts to entire school

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
