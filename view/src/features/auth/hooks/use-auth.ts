import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  authControllerDeleteAccountMutation,
  authControllerLogoutMutation,
  authControllerMeOptions,
  authControllerMeQueryKey,
} from '@/lib/api/generated/@tanstack/react-query.gen';

export function useMeQuery() {
  return useQuery({
    ...authControllerMeOptions(),
    // 401(비로그인)은 정상적인 상태라 재시도할 필요가 없다 — 안 그러면 게스트마다 기본 3회 재시도 후에야 상태가 확정된다.
    retry: false,
  });
}

function clearAuthedCache(queryClient: ReturnType<typeof useQueryClient>) {
  // 로그인 계정이 바뀔 수 있으므로 devlog/insight 등 계정별 캐시를 전부 비운다.
  queryClient.clear();
  queryClient.setQueryData(authControllerMeQueryKey(), null);
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    ...authControllerLogoutMutation(),
    onSuccess: () => clearAuthedCache(queryClient),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    ...authControllerDeleteAccountMutation(),
    onSuccess: () => clearAuthedCache(queryClient),
  });
}
