/**
 * MODULE: Institutional AI Assistant Controller
 *
 * PURPOSE:
 * Versioned REST endpoints for AI chat interactions, conversational threads,
 * role-specific starter prompts, and user usage statistics.
 *
 * DEPENDENCIES:
 * AiService, JwtAuthGuard, CurrentUser.
 *
 * SECURITY:
 * All endpoints require valid JWT authentication. Conversations are strictly isolated to the user.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '@ems/contracts';
import { SendAIMessageDto, CreateAIConversationDto } from './dto/ai-chat.dto';

@ApiTags('Academic AI Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message to the AI Assistant and receive role-aware response' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async chat(@CurrentUser() user: AuthUser, @Body() dto: SendAIMessageDto) {
    return this.aiService.chat(user.id, user.role, user.schoolId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations belonging to the authenticated user' })
  async listConversations(@CurrentUser() user: AuthUser) {
    return this.aiService.listConversations(user.id);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new conversation session' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createConversation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAIConversationDto,
  ) {
    return this.aiService.createConversation(
      user.id,
      user.role,
      user.schoolId,
      dto,
    );
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Retrieve full message history for an owned conversation' })
  async getConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.aiService.getConversation(user.id, id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete an owned conversation and its messages' })
  async deleteConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.aiService.deleteConversation(user.id, id);
  }

  @Get('suggested-prompts')
  @ApiOperation({ summary: 'Get role-tailored prompt suggestions for the authenticated user' })
  getSuggestedPrompts(@CurrentUser() user: AuthUser) {
    return {
      role: user.role,
      prompts: this.aiService.getSuggestedPrompts(user.role),
    };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get token and request usage summary for the user' })
  async getUsageSummary(@CurrentUser() user: AuthUser) {
    return this.aiService.getUsageSummary(user.id);
  }
}
