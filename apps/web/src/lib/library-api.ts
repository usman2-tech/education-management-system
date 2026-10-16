/**
 * MODULE: Library Management API Client (TASK 028)
 *
 * PURPOSE:
 * Typed HTTP client interfacing with NestJS /api/v1/library endpoints.
 * Provides client-side helpers for book catalog, physical copies,
 * circulation (issue, return, renew), reservations, fines, policies,
 * and borrower views for students, teachers, and parents.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  LibraryBookDto,
  CreateBookDto,
  UpdateBookDto,
  BookCopyDto,
  CreateBookCopyDto,
  UpdateBookCopyDto,
  BookLoanDto,
  IssueBookDto,
  ReturnBookDto,
  RenewLoanDto,
  BookReservationDto,
  CreateReservationDto,
  LibraryFineDto,
  WaiveFineDto,
  LibraryPolicyDto,
  UpdatePolicyDto,
  LibraryReportsDto,
} from '@ems/contracts';

export const libraryApi = {
  // 1. Reports & Analytics
  async getReports(schoolId?: string): Promise<LibraryReportsDto> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<LibraryReportsDto>(`/library/reports${query}`);
  },

  // 2. Book Catalog
  async getBooks(filters?: {
    schoolId?: string;
    search?: string;
    category?: string;
    isArchived?: boolean;
  }): Promise<LibraryBookDto[]> {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append('schoolId', filters.schoolId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isArchived !== undefined) params.append('isArchived', String(filters.isArchived));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<LibraryBookDto[]>(`/library/books${query}`);
  },

  async getBook(id: string): Promise<LibraryBookDto> {
    return apiClient.get<LibraryBookDto>(`/library/books/${id}`);
  },

  async createBook(data: CreateBookDto): Promise<LibraryBookDto> {
    return apiClient.post<LibraryBookDto>('/library/books', data);
  },

  async updateBook(id: string, data: UpdateBookDto): Promise<LibraryBookDto> {
    return apiClient.put<LibraryBookDto>(`/library/books/${id}`, data);
  },

  // 3. Physical Copies
  async getCopies(filters?: {
    schoolId?: string;
    bookId?: string;
    status?: string;
  }): Promise<BookCopyDto[]> {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append('schoolId', filters.schoolId);
    if (filters?.bookId) params.append('bookId', filters.bookId);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<BookCopyDto[]>(`/library/copies${query}`);
  },

  async createCopy(data: CreateBookCopyDto): Promise<BookCopyDto> {
    return apiClient.post<BookCopyDto>('/library/copies', data);
  },

  async updateCopy(id: string, data: UpdateBookCopyDto): Promise<BookCopyDto> {
    return apiClient.put<BookCopyDto>(`/library/copies/${id}`, data);
  },

  // 4. Circulation: Issue, Return, Renew
  async issueBook(data: IssueBookDto): Promise<BookLoanDto> {
    return apiClient.post<BookLoanDto>('/library/loans/issue', data);
  },

  async returnBook(data: ReturnBookDto): Promise<BookLoanDto> {
    return apiClient.post<BookLoanDto>('/library/loans/return', data);
  },

  async renewLoan(data: RenewLoanDto): Promise<BookLoanDto> {
    return apiClient.post<BookLoanDto>('/library/loans/renew', data);
  },

  // 5. Reservations
  async createReservation(data: CreateReservationDto): Promise<BookReservationDto> {
    return apiClient.post<BookReservationDto>('/library/reservations', data);
  },

  async cancelReservation(id: string): Promise<BookReservationDto> {
    return apiClient.delete<BookReservationDto>(`/library/reservations/${id}`);
  },

  // 6. Overdue Fines
  async getFines(filters?: {
    schoolId?: string;
    borrowerId?: string;
    status?: string;
  }): Promise<LibraryFineDto[]> {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append('schoolId', filters.schoolId);
    if (filters?.borrowerId) params.append('borrowerId', filters.borrowerId);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<LibraryFineDto[]>(`/library/fines${query}`);
  },

  async waiveFine(data: WaiveFineDto): Promise<LibraryFineDto> {
    return apiClient.post<LibraryFineDto>('/library/fines/waive', data);
  },

  // 7. Borrowing Policies
  async getPolicies(schoolId?: string): Promise<LibraryPolicyDto[]> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<LibraryPolicyDto[]>(`/library/policies${query}`);
  },

  async updatePolicy(borrowerType: string, data: UpdatePolicyDto): Promise<LibraryPolicyDto> {
    return apiClient.put<LibraryPolicyDto>(`/library/policies/${borrowerType}`, data);
  },

  // 8. Borrower Views
  async getMyLoans(): Promise<{
    activeLoans: BookLoanDto[];
    loanHistory: BookLoanDto[];
    reservations: BookReservationDto[];
    fines: LibraryFineDto[];
  }> {
    return apiClient.get<{
      activeLoans: BookLoanDto[];
      loanHistory: BookLoanDto[];
      reservations: BookReservationDto[];
      fines: LibraryFineDto[];
    }>('/library/my-loans');
  },

  async getParentChildLibrary(childId: string): Promise<{
    child: { id: string; name: string };
    activeLoans: BookLoanDto[];
    loanHistory: BookLoanDto[];
    fines: LibraryFineDto[];
  }> {
    return apiClient.get<{
      child: { id: string; name: string };
      activeLoans: BookLoanDto[];
      loanHistory: BookLoanDto[];
      fines: LibraryFineDto[];
    }>(`/library/parent/child/${childId}`);
  },
};
