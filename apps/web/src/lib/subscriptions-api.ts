/**
 * Subscription Management API Client
 */

import { apiClient } from './api-client';
import {
  SubscriptionPlanDto,
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SchoolSubscriptionDto,
  AssignSchoolSubscriptionDto,
} from '@ems/contracts';

export interface SubscriptionOverviewDto {
  totalSubscriptions: number;
  activeCount: number;
  expiredCount: number;
  pendingCount: number;
  expiringSoonCount: number;
  expiringSoon: SchoolSubscriptionDto[];
  recentSubscriptions: SchoolSubscriptionDto[];
}

export const subscriptionsApi = {
  async getPlans(includeInactive: boolean = false): Promise<SubscriptionPlanDto[]> {
    const qs = includeInactive ? '?includeInactive=true' : '';
    return apiClient.get<SubscriptionPlanDto[]>(`/subscriptions/plans${qs}`);
  },

  async getPlanById(id: string): Promise<SubscriptionPlanDto> {
    return apiClient.get<SubscriptionPlanDto>(`/subscriptions/plans/${id}`);
  },

  async createPlan(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanDto> {
    return apiClient.post<SubscriptionPlanDto>('/subscriptions/plans', dto);
  },

  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlanDto> {
    return apiClient.patch<SubscriptionPlanDto>(`/subscriptions/plans/${id}`, dto);
  },

  async assignSubscription(dto: AssignSchoolSubscriptionDto): Promise<SchoolSubscriptionDto> {
    return apiClient.post<SchoolSubscriptionDto>('/subscriptions/assign', dto);
  },

  async getOverview(): Promise<SubscriptionOverviewDto> {
    return apiClient.get<SubscriptionOverviewDto>('/subscriptions/overview');
  },

  async getSchoolSubscriptions(schoolId?: string): Promise<SchoolSubscriptionDto[]> {
    const qs = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<SchoolSubscriptionDto[]>(`/subscriptions/schools${qs}`);
  },

  async updateStatus(
    id: string,
    dto: { status?: string; endDate?: string; autoRenew?: boolean },
  ): Promise<SchoolSubscriptionDto> {
    return apiClient.patch<SchoolSubscriptionDto>(`/subscriptions/${id}/status`, dto);
  },

  async renewSubscription(id: string): Promise<SchoolSubscriptionDto> {
    return apiClient.post<SchoolSubscriptionDto>(`/subscriptions/${id}/renew`, {});
  },

  async getEntitlements(schoolId: string): Promise<any> {
    return apiClient.get<any>(`/subscriptions/entitlements/${schoolId}`);
  },
};
