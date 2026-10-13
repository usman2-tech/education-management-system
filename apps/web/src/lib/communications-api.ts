/**
 * Communications, Notifications & Direct Messaging API Client
 */

import { apiClient } from './api-client';
import {
  NotificationDto,
  ConversationDto,
  DirectMessageDto,
  CreateConversationDto,
  SendMessageDto,
} from '@ems/contracts';

export interface NotificationsResponse {
  unreadCount: number;
  notifications: NotificationDto[];
}

export interface BroadcastAnnouncementDto {
  title: string;
  message: string;
  targetRole?: string;
  link?: string;
}

export const communicationsApi = {
  // Notifications
  async getNotifications(unreadOnly: boolean = false): Promise<NotificationsResponse> {
    const qs = unreadOnly ? '?unreadOnly=true' : '';
    return apiClient.get<NotificationsResponse>(`/communications/notifications${qs}`);
  },

  async markNotificationRead(id: string): Promise<NotificationDto> {
    return apiClient.patch<NotificationDto>(`/communications/notifications/${id}/read`, {});
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>('/communications/notifications/read-all', {});
  },

  async broadcastAnnouncement(dto: BroadcastAnnouncementDto): Promise<{ count: number; message: string }> {
    return apiClient.post<{ count: number; message: string }>('/communications/announcements', dto);
  },

  // Conversations & Direct Messaging
  async getConversations(): Promise<ConversationDto[]> {
    return apiClient.get<ConversationDto[]>('/communications/conversations');
  },

  async createConversation(dto: CreateConversationDto): Promise<{
    conversationId: string;
    message: DirectMessageDto;
  }> {
    return apiClient.post<{
      conversationId: string;
      message: DirectMessageDto;
    }>('/communications/conversations', dto);
  },

  async getConversationMessages(conversationId: string): Promise<(DirectMessageDto & { isMine: boolean })[]> {
    return apiClient.get<(DirectMessageDto & { isMine: boolean })[]>(
      `/communications/conversations/${conversationId}/messages`,
    );
  },

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<DirectMessageDto & { isMine: boolean }> {
    return apiClient.post<DirectMessageDto & { isMine: boolean }>(
      `/communications/conversations/${conversationId}/messages`,
      dto,
    );
  },
};
