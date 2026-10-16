import { apiClient } from './api-client';
import {
  NotificationDto,
  ConversationDto,
  DirectMessageDto,
  CreateConversationDto,
  SendMessageDto,
  RecipientContactDto,
  AnnouncementPreviewDto,
  BroadcastAnnouncementRequest,
  NotificationPreferenceDto,
  UpdateNotificationPreferenceRequest,
} from '@ems/contracts';

export interface NotificationsResponse {
  unreadCount: number;
  notifications: NotificationDto[];
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

  // Announcements & Preview
  async previewAnnouncement(dto: {
    targetRole?: string;
    classSectionId?: string;
  }): Promise<AnnouncementPreviewDto> {
    return apiClient.post<AnnouncementPreviewDto>('/communications/announcements/preview', dto);
  },

  async broadcastAnnouncement(
    dto: BroadcastAnnouncementRequest,
  ): Promise<{ count: number; message: string }> {
    return apiClient.post<{ count: number; message: string }>('/communications/announcements', dto);
  },

  // Conversations & Direct Messaging
  async getUnreadCount(): Promise<{ unreadCount: number }> {
    return apiClient.get<{ unreadCount: number }>('/communications/unread-count');
  },

  async getAvailableRecipients(): Promise<RecipientContactDto[]> {
    return apiClient.get<RecipientContactDto[]>('/communications/recipients');
  },

  async getConversations(
    type: 'inbox' | 'sent' | 'unread' | 'all' = 'all',
    search?: string,
  ): Promise<ConversationDto[]> {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<ConversationDto[]>(`/communications/conversations${qs}`);
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

  async getConversationMessages(
    conversationId: string,
  ): Promise<(DirectMessageDto & { isMine: boolean })[]> {
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

  // Notification Preferences
  async getPreferences(schoolId?: string): Promise<NotificationPreferenceDto> {
    const qs = schoolId ? `?schoolId=${schoolId}` : '';
    return apiClient.get<NotificationPreferenceDto>(`/communications/preferences${qs}`);
  },

  async updatePreferences(
    dto: UpdateNotificationPreferenceRequest,
    schoolId?: string,
  ): Promise<NotificationPreferenceDto> {
    const qs = schoolId ? `?schoolId=${schoolId}` : '';
    return apiClient.put<NotificationPreferenceDto>(`/communications/preferences${qs}`, dto);
  },
};

