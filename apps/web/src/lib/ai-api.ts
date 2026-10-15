/**
 * MODULE: Institutional AI Assistant API Client
 *
 * PURPOSE:
 * Typed client methods for communicating with NestJS AI Assistant endpoints.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  AIConversationDto,
  AIChatResponseDto,
  CreateAIConversationDto,
  SendAIMessageDto,
  AIUsageSummaryDto,
} from '@ems/contracts';

export const aiApi = {
  async listConversations(): Promise<AIConversationDto[]> {
    return apiClient.request<AIConversationDto[]>('/ai/conversations');
  },

  async getConversation(id: string): Promise<AIConversationDto> {
    return apiClient.request<AIConversationDto>(`/ai/conversations/${id}`);
  },

  async createConversation(dto: CreateAIConversationDto = {}): Promise<AIConversationDto> {
    return apiClient.request<AIConversationDto>('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    return apiClient.request<{ success: boolean }>(`/ai/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  async chat(dto: SendAIMessageDto): Promise<AIChatResponseDto> {
    return apiClient.request<AIChatResponseDto>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getSuggestedPrompts(): Promise<{ role: string; prompts: string[] }> {
    return apiClient.request<{ role: string; prompts: string[] }>('/ai/suggested-prompts');
  },

  async getUsage(): Promise<AIUsageSummaryDto> {
    return apiClient.request<AIUsageSummaryDto>('/ai/usage');
  },
};
