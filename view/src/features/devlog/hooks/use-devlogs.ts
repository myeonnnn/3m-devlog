import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  devLogControllerCreateMutation,
  devLogControllerFindAllInfiniteOptions,
  devLogControllerFindAllInfiniteQueryKey,
  devLogControllerPopularTagsOptions,
  devLogControllerPopularTagsQueryKey,
  devLogControllerRemoveMutation,
  devLogControllerStatsOptions,
  devLogControllerStatsQueryKey,
  devLogControllerStreakOptions,
  devLogControllerStreakQueryKey,
  devLogControllerUpdateMutation,
} from '@/lib/api/generated/@tanstack/react-query.gen';
import { DevLogFilter } from '../types';

function toQuery(filter: DevLogFilter) {
  return {
    search: filter.search || undefined,
    tag: filter.tag || undefined,
    period: filter.period && filter.period !== 'all' ? filter.period : undefined,
  };
}

function invalidateDevLogQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: devLogControllerFindAllInfiniteQueryKey() });
  queryClient.invalidateQueries({ queryKey: devLogControllerPopularTagsQueryKey() });
  queryClient.invalidateQueries({ queryKey: devLogControllerStatsQueryKey() });
  queryClient.invalidateQueries({ queryKey: devLogControllerStreakQueryKey() });
}

export function useDevLogsQuery(filter: DevLogFilter, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    ...devLogControllerFindAllInfiniteOptions({ query: toQuery(filter) }),
    initialPageParam: {},
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: options?.enabled ?? true,
  });
}

export function usePopularTagsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...devLogControllerPopularTagsOptions(),
    enabled: options?.enabled ?? true,
  });
}

export function useStreakQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...devLogControllerStreakOptions(),
    enabled: options?.enabled ?? true,
  });
}

export function useStatsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...devLogControllerStatsOptions(),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateDevLog() {
  const queryClient = useQueryClient();
  return useMutation({
    ...devLogControllerCreateMutation(),
    onSuccess: () => invalidateDevLogQueries(queryClient),
  });
}

export function useUpdateDevLog() {
  const queryClient = useQueryClient();
  return useMutation({
    ...devLogControllerUpdateMutation(),
    onSuccess: () => invalidateDevLogQueries(queryClient),
  });
}

export function useDeleteDevLog() {
  const queryClient = useQueryClient();
  return useMutation({
    ...devLogControllerRemoveMutation(),
    onSuccess: () => invalidateDevLogQueries(queryClient),
  });
}
