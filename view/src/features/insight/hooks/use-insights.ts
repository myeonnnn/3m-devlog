import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { insightApi } from '../api/insight-api';
import { InsightPeriodType } from '../types';

const insightKeys = {
  all: ['insights'] as const,
  latest: () => [...insightKeys.all, 'latest'] as const,
  byPeriod: (periodType: InsightPeriodType, periodKey: string) =>
    [...insightKeys.all, 'byPeriod', periodType, periodKey] as const,
};

export function useLatestInsightsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: insightKeys.latest(),
    queryFn: () => insightApi.latest(),
    enabled: options?.enabled ?? true,
  });
}

export function useInsightByPeriodQuery(
  periodType: InsightPeriodType,
  periodKey: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: insightKeys.byPeriod(periodType, periodKey),
    queryFn: () => insightApi.getByPeriod(periodType, periodKey),
    enabled: options?.enabled ?? true,
  });
}

export function useGenerateInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodType, periodKey }: { periodType: InsightPeriodType; periodKey: string }) =>
      insightApi.generate(periodType, periodKey),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(insightKeys.byPeriod(variables.periodType, variables.periodKey), data);
      queryClient.invalidateQueries({ queryKey: insightKeys.latest() });
    },
  });
}
