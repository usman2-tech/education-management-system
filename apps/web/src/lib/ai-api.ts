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

export const aiTutorApi = {
  async getContext(): Promise<{
    studentId: string;
    studentName: string;
    gradeLevel: string;
    courses: Array<{ id: string; title: string; code: string; subjectId: string; subjectName: string }>;
    subjects: Array<{ id: string; name: string; code: string }>;
  }> {
    return apiClient.request('/ai/tutor/context');
  },

  async generateConceptExplanation(dto: {
    subjectId?: string;
    courseId?: string;
    topic: string;
    difficultyLevel?: string;
    explanationStyle?: string;
    question?: string;
  }): Promise<any> {
    return apiClient.request('/ai/tutor/concept-explanation', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async socraticTutor(dto: {
    message: string;
    courseId?: string;
    subjectId?: string;
    conversationId?: string;
  }): Promise<any> {
    return apiClient.request('/ai/tutor/socratic', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async generatePracticeQuiz(dto: {
    courseId?: string;
    subjectId?: string;
    topic: string;
    difficultyLevel?: string;
    questionCount?: number;
    questionType?: string;
  }): Promise<any> {
    return apiClient.request('/ai/tutor/practice-quiz', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async submitPracticeQuiz(dto: {
    quizId: string;
    answers: Record<string, any>;
  }): Promise<any> {
    return apiClient.request('/ai/tutor/submit-quiz', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async listPracticeQuizzes(): Promise<any[]> {
    return apiClient.request('/ai/tutor/practice-quizzes');
  },

  async getPracticeQuiz(id: string): Promise<any> {
    return apiClient.request(`/ai/tutor/practice-quiz/${id}`);
  },

  async generateRevisionPlan(dto: {
    timeframeDays?: number;
    focusSubjects?: string[];
    targetExamDate?: string;
  }): Promise<any> {
    return apiClient.request('/ai/tutor/revision-plan', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async saveRevisionPlan(dto: {
    title: string;
    description?: string;
    courseId?: string;
    subjectId?: string;
    planContent: Record<string, any>;
  }): Promise<any> {
    return apiClient.request('/ai/tutor/save-revision-plan', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async listRevisionPlans(): Promise<any[]> {
    return apiClient.request('/ai/tutor/revision-plans');
  },

  async getRevisionPlan(id: string): Promise<any> {
    return apiClient.request(`/ai/tutor/revision-plan/${id}`);
  },

  async getHomeworkGuidance(dto: {
    homeworkId: string;
    questionOrDoubt?: string;
  }): Promise<any> {
    return apiClient.request('/ai/tutor/homework-guidance', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getLearningProgress(): Promise<{
    insights: any;
    metrics: {
      attendanceRate: number;
      totalQuizzesAttempted: number;
      completedQuizzesCount: number;
      averagePracticeQuizScore: number | null;
      activeRevisionPlansCount: number;
      recentGrades: any[];
    };
  }> {
    return apiClient.request('/ai/tutor/learning-progress');
  },
};

export const aiParentApi = {
  async getChildren(): Promise<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
    admissionNumber: string | null;
    gradeLevel: string;
    schoolId: string;
    schoolName: string;
    className: string;
    sectionName: string | null;
    relationshipType: string;
  }>> {
    return apiClient.request('/ai/parent/children');
  },

  async getAcademicSummary(studentId: string): Promise<any> {
    return apiClient.request(`/ai/parent/academic-summary/${studentId}`);
  },

  async getAttendanceSummary(studentId: string): Promise<any> {
    return apiClient.request(`/ai/parent/attendance-summary/${studentId}`);
  },

  async getHomeworkSummary(studentId: string): Promise<any> {
    return apiClient.request(`/ai/parent/homework-summary/${studentId}`);
  },

  async getFeeExplanation(studentId: string): Promise<any> {
    return apiClient.request(`/ai/parent/fee-explanation/${studentId}`);
  },

  async getHomeLearningSuggestions(dto: {
    studentId: string;
    subjectId?: string;
    focusArea?: string;
  }): Promise<any> {
    return apiClient.request('/ai/parent/home-learning', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async askQuestion(dto: {
    studentId: string;
    question: string;
    conversationId?: string;
    topic?: string;
  }): Promise<any> {
    return apiClient.request('/ai/parent/ask', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getConversations(studentId: string): Promise<any[]> {
    return apiClient.request(`/ai/parent/conversations/${studentId}`);
  },
};

