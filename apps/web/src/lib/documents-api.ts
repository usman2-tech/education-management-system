/**
 * MODULE: Institutional Documents API Client (TASK 026)
 *
 * PURPOSE:
 * Typed client wrapper for Institutional Document Management, Grounded Q&A,
 * Summarization, Administrative Notice Drafts, and Verified Narrative Reports.
 * Matches backend DocumentsController endpoints exactly.
 *
 * DEPENDENCIES:
 * @ems/contracts, @/lib/api-client
 */

import { apiClient } from './api-client';
import {
  DocumentCategory,
  DocumentProcessingStatus,
  DocumentDraftStatus,
  UserRole,
} from '@ems/contracts';

export interface DocumentListParams {
  search?: string;
  category?: DocumentCategory | string;
  visibility?: UserRole | string;
  isPublished?: boolean;
  page?: number;
  limit?: number;
}

export interface UploadDocumentPayload {
  title: string;
  description?: string;
  category: DocumentCategory;
  visibilityRoles: UserRole[];
  isPublished?: boolean;
  schoolId?: string;
  textContent?: string;
  tags?: string[];
}

export interface CreateDraftPayload {
  title: string;
  audience: string;
  purpose: string;
  keyPoints: string[];
  tone?: string;
  schoolId?: string;
}

export interface ReviewDraftPayload {
  status: DocumentDraftStatus;
  reviewFeedback?: string;
}

export interface BroadcastDraftPayload {
  announcementTitle?: string;
  targetRole?: UserRole;
  channel?: 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export const documentsApi = {
  // Document Management
  getDocuments: async (params?: DocumentListParams) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.visibility && params.visibility !== 'ALL') query.append('visibility', params.visibility);
    if (params?.isPublished !== undefined) query.append('isPublished', String(params.isPublished));
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.request<any>(`/documents${qs}`, { method: 'GET' });
  },

  getDocumentById: async (id: string) => {
    return apiClient.request<any>(`/documents/${id}`, { method: 'GET' });
  },

  uploadDocument: async (payload: UploadDocumentPayload, file?: File) => {
    const docType = file
      ? (file.name.endsWith('.pdf') ? 'PDF' : file.name.endsWith('.docx') ? 'DOCX' : 'TXT')
      : 'TXT';

    if (file) {
      // Direct file upload payload
      return apiClient.request<any>('/documents', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          documentType: docType,
          fileName: file.name,
          mimeType: file.type || (docType === 'PDF' ? 'application/pdf' : 'text/plain'),
          fileSize: file.size,
          textContent: payload.textContent || `[Uploaded file: ${file.name}]`,
        }),
      });
    } else {
      return apiClient.request<any>('/documents', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          documentType: docType,
        }),
      });
    }
  },

  replaceVersion: async (
    id: string,
    payload: { changeSummary: string; textContent?: string; schoolId?: string },
    file?: File,
  ) => {
    return apiClient.request<any>(`/documents/${id}/version`, {
      method: 'POST',
      body: JSON.stringify({
        changeSummary: payload.changeSummary,
        textContent: payload.textContent || (file ? `[Uploaded Version File: ${file.name}]` : undefined),
        fileName: file?.name,
        fileSize: file?.size,
      }),
    });
  },

  archiveDocument: async (id: string) => {
    return apiClient.request<any>(`/documents/${id}`, { method: 'DELETE' });
  },

  // Grounded Search & Summarize
  searchSections: async (query: string, category?: string, limit = 5) => {
    const params = new URLSearchParams({ query, limit: String(limit) });
    if (category && category !== 'ALL') params.append('category', category);
    return apiClient.request<any>(`/documents/search/sections?${params.toString()}`, {
      method: 'GET',
    });
  },

  summarizeDocument: async (id: string, audience?: string, focusArea?: string) => {
    return apiClient.request<any>(`/documents/${id}/summarize`, {
      method: 'POST',
      body: JSON.stringify({ summaryType: 'FULL' }),
    });
  },

  // Administrative Drafts
  getDrafts: async (_status?: string) => {
    return apiClient.request<any>('/documents/drafts', { method: 'GET' });
  },

  createDraft: async (payload: CreateDraftPayload) => {
    return apiClient.request<any>('/documents/drafts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateDraft: async (
    id: string,
    payload: { title?: string; draftContent?: string; reviewFeedback?: string; status?: DocumentDraftStatus },
  ) => {
    return apiClient.request<any>(`/documents/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  reviewDraft: async (id: string, payload: ReviewDraftPayload) => {
    return apiClient.request<any>(`/documents/drafts/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  broadcastDraft: async (id: string, _payload?: BroadcastDraftPayload) => {
    return apiClient.request<any>(`/documents/drafts/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  // Verified Narrative Reports
  generateNarrativeReport: async (reportType: string, schoolId?: string) => {
    return apiClient.request<any>('/documents/reports/narrative', {
      method: 'POST',
      body: JSON.stringify({ reportType, schoolId }),
    });
  },
};
