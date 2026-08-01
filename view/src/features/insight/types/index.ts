export type InsightPeriodType = 'WEEKLY' | 'MONTHLY';

export interface Insight {
  id: string;
  ownerId: string;
  periodType: InsightPeriodType;
  periodKey: string;
  summary: string;
  patterns: string[];
  logCount: number;
  generatedAt: string;
}

export interface LatestInsights {
  weekly: Insight | null;
  monthly: Insight | null;
}
