import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  insightControllerFindByPeriodOptions,
  insightControllerFindByPeriodQueryKey,
  insightControllerGenerateMutation,
  insightControllerLatestOptions,
  insightControllerLatestQueryKey,
} from '@/lib/api/generated/@tanstack/react-query.gen';
import { InsightPeriodType } from '../types';

export function useLatestInsightsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...insightControllerLatestOptions(),
    enabled: options?.enabled ?? true,
  });
}

export function useInsightByPeriodQuery(
  periodType: InsightPeriodType,
  periodKey: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...insightControllerFindByPeriodOptions({ query: { periodType, periodKey } }),
    select: (data) => data.insight,
    enabled: options?.enabled ?? true,
  });
}

export function useGenerateInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    ...insightControllerGenerateMutation(),
    onSuccess: (data, variables) => {
      const { periodType, periodKey } = variables.body;
      queryClient.setQueryData(
        insightControllerFindByPeriodQueryKey({ query: { periodType, periodKey } }),
        { insight: data },
      );
      queryClient.invalidateQueries({ queryKey: insightControllerLatestQueryKey() });
    },
  });
}
