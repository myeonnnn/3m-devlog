import type { InsightResponseDto, LatestInsightResponseDto } from '@/lib/api/generated/types.gen';

// 생성된 타입에는 개별 property에 인라인으로만 존재해 별도 export가 없다.
export type InsightPeriodType = 'WEEKLY' | 'MONTHLY';
export type Insight = InsightResponseDto;
export type LatestInsights = LatestInsightResponseDto;
