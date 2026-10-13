/**
 * MODULE: Communications & Messaging - REST Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  BroadcastAnnouncementDto,
  CreateConversationDto,
  SendMessageDto,
} from './dto/communications.dto';

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  @Get('notifications')
  getNotifications(
    @CurrentUser() user: AuthUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.communicationsService.getNotifications(
      user as any,
      unreadOnly === 'true',
    );
  }

  @Patch('notifications/:id/read')
  markNotificationAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.communicationsService.markAsRead(user as any, id);
  }

  @Post('notifications/read-all')
  markAllNotificationsAsRead(@CurrentUser() user: AuthUser) {
    return this.communicationsService.markAllAsRead(user as any);
  }

  @Post('announcements')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  broadcastAnnouncement(
    @CurrentUser() user: AuthUser,
    @Body() dto: BroadcastAnnouncementDto,
  ) {
    return this.communicationsService.broadcastAnnouncement(user as any, dto);
  }

  // ============================================================================
  // CONVERSATIONS & MESSAGING
  // ============================================================================

  @Get('conversations')
  getConversations(@CurrentUser() user: AuthUser) {
    return this.communicationsService.getConversations(user as any);
  }

  @Post('conversations')
  createConversation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.communicationsService.createConversation(user as any, dto);
  }

  @Get('conversations/:id/messages')
  getConversationMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.communicationsService.getConversationMessages(user as any, id);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.communicationsService.sendMessage(user as any, id, dto);
  }
}
