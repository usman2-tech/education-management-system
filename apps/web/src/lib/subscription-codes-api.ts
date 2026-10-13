/**
 * Subscription Codes & Redemption API Client
 */

import { apiClient } from './api-client';
import {
  SubscriptionCodeDto,
  GenerateSubscriptionCodesDto,
  RedeemSubscriptionCodeDto,
  CodeRedemptionDto,
} from '@ems/contracts';

export const subscriptionCodesApi = {
  async generateCodes(dto: GenerateSubscriptionCodesDto): Promise<SubscriptionCodeDto[]> {
    return apiClient.post<SubscriptionCodeDto[]>('/subscription-codes/generate', dto);
  },

  async getCodes(params?: {
    planId?: string;
    schoolId?: string;
    isRevoked?: boolean;
    search?: string;
  }): Promise<SubscriptionCodeDto[]> {
    const query = new URLSearchParams();
    if (params?.planId) query.append('planId', params.planId);
    if (params?.schoolId) query.append('schoolId', params.schoolId);
    if (params?.isRevoked !== undefined) query.append('isRevoked', String(params.isRevoked));
    if (params?.search) query.append('search', params.search);

    const qs = query.toString();
    const url = `/subscription-codes${qs ? `?${qs}` : ''}`;
    return apiClient.get<SubscriptionCodeDto[]>(url);
  },

  async revokeCode(id: string): Promise<SubscriptionCodeDto> {
    return apiClient.post<SubscriptionCodeDto>(`/subscription-codes/${id}/revoke`, {});
  },

  async getRedemptions(codeId?: string): Promise<CodeRedemptionDto[]> {
    const qs = codeId ? `?codeId=${encodeURIComponent(codeId)}` : '';
    return apiClient.get<CodeRedemptionDto[]>(`/subscription-codes/redemptions${qs}`);
  },

  async redeemCode(dto: RedeemSubscriptionCodeDto): Promise<{
    success: boolean;
    message: string;
    redemption: CodeRedemptionDto;
  }> {
    return apiClient.post<{
      success: boolean;
      message: string;
      redemption: CodeRedemptionDto;
    }>('/subscription-codes/redeem', dto);
  },

  async getMyRedemptions(): Promise<CodeRedemptionDto[]> {
    return apiClient.get<CodeRedemptionDto[]>('/subscription-codes/my-redemptions');
  },
};
