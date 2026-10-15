/**
 * MODULE: AI Chat DTOs
 *
 * PURPOSE:
 * Input validation for AI chat messages and conversation lifecycle.
 *
 * SECURITY:
 * Sanitizes input lengths and message contents before LLM processing.
 */

import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendAIMessageDto {
  @ApiPropertyOptional({ description: 'Existing conversation UUID. If omitted, a new conversation is created.' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ description: 'User message to the AI Academic Assistant', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}

export class CreateAIConversationDto {
  @ApiPropertyOptional({ description: 'Optional conversation title', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: 'Optional initial prompt message', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  initialMessage?: string;
}
