import { api } from '@/lib/api';
import type { LostFoundInsightsResponse } from '@/types/insights';

export type InsightsPeriod = '7d' | '30d';

export interface GenerateInsightsInput {
  period: InsightsPeriod;
  regenerate?: boolean;
}

export const insightsApi = {
  generate(input: GenerateInsightsInput): Promise<LostFoundInsightsResponse> {
    return api.post<LostFoundInsightsResponse>('/ai/lost-found-insights', input);
  },
  generateAdmin(input: GenerateInsightsInput): Promise<LostFoundInsightsResponse> {
    return api.post<LostFoundInsightsResponse>('/ai/admin-insights', input);
  },
};
