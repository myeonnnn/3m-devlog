import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { Insight, InsightPeriodType } from '../types';
import {
  currentPeriodKey,
  formatPeriodLabel,
  isFuturePeriodKey,
  shiftPeriodKey,
} from '../rules/period-key';
import { useGenerateInsight } from './use-insights';

export interface InsightController {
  periodType: InsightPeriodType;
  periodLabel: string;
  canGoNext: boolean;
  insight: Insight | undefined;
  isPending: boolean;
  isEmptyPeriod: boolean;
  isError: boolean;
  switchPeriodType: (periodType: InsightPeriodType) => void;
  shiftPeriod: (delta: number) => void;
  generate: () => void;
}

export function useInsightController(): InsightController {
  const [periodType, setPeriodType] = useState<InsightPeriodType>('WEEKLY');
  const [periodKey, setPeriodKey] = useState(() => currentPeriodKey('WEEKLY'));
  const generateInsight = useGenerateInsight();

  const switchPeriodType = (nextType: InsightPeriodType) => {
    setPeriodType(nextType);
    setPeriodKey(currentPeriodKey(nextType));
    generateInsight.reset();
  };

  const shiftPeriod = (delta: number) => {
    setPeriodKey((current) => shiftPeriodKey(periodType, current, delta));
    generateInsight.reset();
  };

  const nextPeriodKey = shiftPeriodKey(periodType, periodKey, 1);
  const isEmptyPeriodError =
    generateInsight.error instanceof ApiError && generateInsight.error.status === 422;

  return {
    periodType,
    periodLabel: formatPeriodLabel(periodType, periodKey),
    canGoNext: !isFuturePeriodKey(periodType, nextPeriodKey),
    insight: generateInsight.data,
    isPending: generateInsight.isPending,
    isEmptyPeriod: isEmptyPeriodError,
    isError: generateInsight.isError && !isEmptyPeriodError,
    switchPeriodType,
    shiftPeriod,
    generate: () => generateInsight.mutate({ periodType, periodKey }),
  };
}
