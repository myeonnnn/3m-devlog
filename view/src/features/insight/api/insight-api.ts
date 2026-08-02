import { request } from '@/lib/api-client';
import { Insight, InsightPeriodType, LatestInsights } from '../types';

export const insightApi = {
  generate(periodType: InsightPeriodType, periodKey: string): Promise<Insight> {
    return request<Insight>('/insights/generate', {
      method: 'POST',
      body: JSON.stringify({ periodType, periodKey }),
    });
  },

  latest(): Promise<LatestInsights> {
    return request<LatestInsights>('/insights/latest');
  },

  async getByPeriod(periodType: InsightPeriodType, periodKey: string): Promise<Insight | null> {
    const params = new URLSearchParams({ periodType, periodKey });
    const { insight } = await request<{ insight: Insight | null }>(
      `/insights?${params.toString()}`,
    );
    return insight;
  },
};
