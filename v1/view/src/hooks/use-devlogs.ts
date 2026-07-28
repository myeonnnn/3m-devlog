import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { devlogApi } from '@/lib/devlog-api';
import {
  CreateDevLogInput,
  DevLogFilter,
  UpdateDevLogInput,
} from '@/lib/types';

const devlogKeys = {
  all: ['devlogs'] as const,
  list: (filter: DevLogFilter) => [...devlogKeys.all, 'list', filter] as const,
  detail: (id: string) => [...devlogKeys.all, 'detail', id] as const,
  popularTags: () => [...devlogKeys.all, 'popularTags'] as const,
  stats: () => [...devlogKeys.all, 'stats'] as const,
};

export function useDevLogsQuery(filter: DevLogFilter, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: devlogKeys.list(filter),
    queryFn: () => devlogApi.list(filter),
    enabled: options?.enabled ?? true,
  });
}

export function usePopularTagsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: devlogKeys.popularTags(),
    queryFn: () => devlogApi.popularTags(),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateDevLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDevLogInput) => devlogApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.all });
    },
  });
}

export function useUpdateDevLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDevLogInput }) =>
      devlogApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.all });
    },
  });
}

export function useStatsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: devlogKeys.stats(),
    queryFn: () => devlogApi.stats(),
    enabled: options?.enabled ?? true,
  });
}

export function useDeleteDevLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => devlogApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devlogKeys.all });
    },
  });
}
