/**
 * MODULE: Communications & Messaging - REST Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
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
  PreviewAnnouncementDto,
  SendMessageDto,
  UpdateNotificationPreferenceDto,
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

  // ============================================================================
  // ANNOUNCEMENTS
  // ============================================================================

  @Post('announcements/preview')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  previewAnnouncement(
    @CurrentUser() user: AuthUser,
    @Body() dto: PreviewAnnouncementDto,
  ) {
    return this.communicationsService.previewAnnouncement(user as any, dto);
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

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.communicationsService.getUnreadCount(user as any);
  }

  @Get('recipients')
  getAvailableRecipients(@CurrentUser() user: AuthUser) {
    return this.communicationsService.getAvailableRecipients(user as any);
  }

  @Get('conversations')
  getConversations(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: 'inbox' | 'sent' | 'unread' | 'all',
    @Query('search') search?: string,
  ) {
    return this.communicationsService.getConversations(
      user as any,
      type || 'all',
      search,
    );
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

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  @Get('preferences')
  getNotificationPreferences(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.communicationsService.getNotificationPreferences(
      user as any,
      schoolId,
    );
  }

  @Put('preferences')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  updateNotificationPreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationPreferenceDto,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.communicationsService.updateNotificationPreferences(
      user as any,
      dto,
      schoolId,
    );
  }
}

