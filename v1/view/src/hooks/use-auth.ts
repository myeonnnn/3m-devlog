import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/auth-api';

const meKey = ['auth', 'me'] as const;

export function useMeQuery() {
  return useQuery({
    queryKey: meKey,
    queryFn: () => authApi.me(),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(meKey, null);
      queryClient.invalidateQueries({ queryKey: ['devlogs'] });
    },
  });
}
