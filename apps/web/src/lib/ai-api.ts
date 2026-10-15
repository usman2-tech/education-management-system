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

export const aiCopilotApi = {
  async getContext(): Promise<{
    classes: Array<{ id: string; name: string; className: string; sectionName: string; studentCount: number; subjects: Array<{ id: string; name: string; code: string }> }>;
    subjects: Array<{ id: string; name: string; code: string }>;
    courses: Array<{ id: string; title: string; code: string }>;
    pendingSubmissions: Array<{ id: string; studentName: string; homeworkTitle: string; submittedAt: string; maxPoints: number; contentPreview: string }>;
  }> {
    return apiClient.request('/ai/copilot/context');
  },

  async generateLessonPlan(dto: any): Promise<any> {
    return apiClient.request('/ai/copilot/lesson-plan', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async generateHomework(dto: any): Promise<any> {
    return apiClient.request('/ai/copilot/homework', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async generateExam(dto: any): Promise<any> {
    return apiClient.request('/ai/copilot/exam', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async generateGrading(dto: any): Promise<any> {
    return apiClient.request('/ai/copilot/grading', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async generateInsights(dto: any): Promise<any> {
    return apiClient.request('/ai/copilot/insights', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async generateTeachingMaterials(dto: any): Promise<any> {
    return apiClient.request('/ai/copilot/teaching-materials', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async listDrafts(contentType?: string, status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (contentType) params.append('contentType', contentType);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.request(`/ai/copilot/drafts${qs}`);
  },

  async getDraft(id: string): Promise<any> {
    return apiClient.request(`/ai/copilot/drafts/${id}`);
  },

  async updateDraft(id: string, dto: any): Promise<any> {
    return apiClient.request(`/ai/copilot/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async approveAndPublishDraft(id: string, dto: any): Promise<any> {
    return apiClient.request(`/ai/copilot/drafts/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async deleteDraft(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.request(`/ai/copilot/drafts/${id}`, {
      method: 'DELETE',
    });
  },
};
