/**
 * MODULE: Fees Management API Client
 *
 * PURPOSE:
 * Typed HTTP client interfacing with NestJS /api/v1/fees endpoints.
 * Provides client-side helpers for fee structures, student fee assignments,
 * invoice operations, payment recordings, receipts, and parent/student portals.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  FeeDashboardDto,
  FeeCategoryDto,
  CreateFeeCategoryRequest,
  FeeStructureDto,
  CreateFeeStructureRequest,
  FeeDiscountDto,
  CreateFeeDiscountRequest,
  StudentFeeAssignmentDto,
  AssignStudentFeeRequest,
  FeeInvoiceDto,
  CreateFeeInvoiceRequest,
  FeePaymentDto,
  RecordFeePaymentRequest,
  StudentFeeProfileDto,
} from '@ems/contracts';

export const feesApi = {
  // 1. Dashboard
  async getDashboard(schoolId?: string): Promise<FeeDashboardDto> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<FeeDashboardDto>(`/fees/dashboard${query}`);
  },

  // 2. Categories
  async getCategories(schoolId?: string): Promise<FeeCategoryDto[]> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<FeeCategoryDto[]>(`/fees/categories${query}`);
  },

  async createCategory(data: CreateFeeCategoryRequest): Promise<FeeCategoryDto> {
    return apiClient.post<FeeCategoryDto>('/fees/categories', data);
  },

  // 3. Structures
  async getStructures(filters?: {
    academicYearId?: string;
    categoryId?: string;
    gradeLevel?: string;
    schoolId?: string;
  }): Promise<FeeStructureDto[]> {
    const params = new URLSearchParams();
    if (filters?.academicYearId) params.append('academicYearId', filters.academicYearId);
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.gradeLevel) params.append('gradeLevel', filters.gradeLevel);
    if (filters?.schoolId) params.append('schoolId', filters.schoolId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<FeeStructureDto[]>(`/fees/structures${query}`);
  },

  async createStructure(data: CreateFeeStructureRequest): Promise<FeeStructureDto> {
    return apiClient.post<FeeStructureDto>('/fees/structures', data);
  },

  // 4. Discounts
  async getDiscounts(schoolId?: string): Promise<FeeDiscountDto[]> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<FeeDiscountDto[]>(`/fees/discounts${query}`);
  },

  async createDiscount(data: CreateFeeDiscountRequest): Promise<FeeDiscountDto> {
    return apiClient.post<FeeDiscountDto>('/fees/discounts', data);
  },

  // 5. Assignments
  async getAssignments(filters?: {
    studentId?: string;
    academicYearId?: string;
    feeStructureId?: string;
    schoolId?: string;
  }): Promise<StudentFeeAssignmentDto[]> {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.academicYearId) params.append('academicYearId', filters.academicYearId);
    if (filters?.feeStructureId) params.append('feeStructureId', filters.feeStructureId);
    if (filters?.schoolId) params.append('schoolId', filters.schoolId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<StudentFeeAssignmentDto[]>(`/fees/assignments${query}`);
  },

  async assignFee(data: AssignStudentFeeRequest): Promise<{ assignedCount: number; assignments: any[] }> {
    return apiClient.post<{ assignedCount: number; assignments: any[] }>('/fees/assignments', data);
  },

  // 6. Invoices
  async getInvoices(filters?: {
    status?: string;
    studentId?: string;
    academicYearId?: string;
    search?: string;
    schoolId?: string;
  }): Promise<FeeInvoiceDto[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.academicYearId) params.append('academicYearId', filters.academicYearId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.schoolId) params.append('schoolId', filters.schoolId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<FeeInvoiceDto[]>(`/fees/invoices${query}`);
  },

  async getInvoiceById(id: string): Promise<FeeInvoiceDto> {
    return apiClient.get<FeeInvoiceDto>(`/fees/invoices/${encodeURIComponent(id)}`);
  },

  async createInvoice(data: CreateFeeInvoiceRequest): Promise<FeeInvoiceDto> {
    return apiClient.post<FeeInvoiceDto>('/fees/invoices', data);
  },

  async voidInvoice(id: string, reason: string): Promise<FeeInvoiceDto> {
    return apiClient.post<FeeInvoiceDto>(`/fees/invoices/${encodeURIComponent(id)}/void`, { reason });
  },

  // 7. Payments & Receipts
  async getPayments(filters?: {
    invoiceId?: string;
    studentId?: string;
    paymentMethod?: string;
    schoolId?: string;
  }): Promise<FeePaymentDto[]> {
    const params = new URLSearchParams();
    if (filters?.invoiceId) params.append('invoiceId', filters.invoiceId);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters?.schoolId) params.append('schoolId', filters.schoolId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<FeePaymentDto[]>(`/fees/payments${query}`);
  },

  async recordPayment(data: RecordFeePaymentRequest): Promise<FeePaymentDto & { remainingBalance: number }> {
    return apiClient.post<FeePaymentDto & { remainingBalance: number }>('/fees/payments', data);
  },

  async getReceiptById(id: string): Promise<any> {
    return apiClient.get<any>(`/fees/payments/${encodeURIComponent(id)}/receipt`);
  },

  async reversePayment(id: string, reason: string): Promise<FeePaymentDto> {
    return apiClient.post<FeePaymentDto>(`/fees/payments/${encodeURIComponent(id)}/reverse`, { reason });
  },

  // 8. Profiles & Portals
  async getStudentFeeProfile(studentId: string): Promise<StudentFeeProfileDto> {
    return apiClient.get<StudentFeeProfileDto>(`/fees/student/${encodeURIComponent(studentId)}`);
  },

  async getMyFees(): Promise<StudentFeeProfileDto> {
    return apiClient.get<StudentFeeProfileDto>('/fees/my-fees');
  },

  async getParentChildrenFees(): Promise<any[]> {
    return apiClient.get<any[]>('/fees/parent/children');
  },
};
