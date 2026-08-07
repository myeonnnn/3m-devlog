import { CreateDevLogInput, DevLog, DevLogFilter, PopularTag } from '../types';
import { resolveStreakIcon } from '../rules/streak';
import {
  useCreateDevLog,
  useDeleteDevLog,
  useDevLogsQuery,
  usePopularTagsQuery,
  useStreakQuery,
  useUpdateDevLog,
} from './use-devlogs';
import { useGuestDevLogs } from './use-guest-devlogs';

// isAuthed 여부가 데이터 소스/뮤테이션/렌더링을 여러 곳에서 갈라놓던 것을
// 분기별 컨트롤러 하나로 모아, 호출부에서는 컨트롤러 선택 지점 하나만 남긴다.
export interface DevLogController {
  devLogs: DevLog[];
  popularTags: PopularTag[];
  streakIcon: string | null;
  isLoading: boolean;
  listError: Error | null;
  bannerError: string | null;
  formError: string | null;
  isSubmitting: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  submit: (input: CreateDevLogInput, editingId: string | null, onDone: () => void) => void;
  remove: (id: string) => void;
  resetForm: () => void;
}

export const useAuthedDevLogController = (
  filter: DevLogFilter,
  enabled: boolean,
): DevLogController => {
  const devLogsQuery = useDevLogsQuery(filter, { enabled });
  const popularTagsQuery = usePopularTagsQuery({ enabled });
  const streakQuery = useStreakQuery({ enabled });
  const createDevLog = useCreateDevLog();
  const updateDevLog = useUpdateDevLog();
  const deleteDevLog = useDeleteDevLog();

  return {
    devLogs: devLogsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    popularTags: popularTagsQuery.data ?? [],
    streakIcon: resolveStreakIcon(streakQuery.data?.days ?? 0),
    isLoading: devLogsQuery.isLoading,
    listError: devLogsQuery.error,
    bannerError: deleteDevLog.isError
      ? `삭제에 실패했어요 — ${deleteDevLog.error.message}`
      : null,
    formError: createDevLog.error?.message ?? updateDevLog.error?.message ?? null,
    isSubmitting: createDevLog.isPending || updateDevLog.isPending,
    hasNextPage: devLogsQuery.hasNextPage,
    isFetchingNextPage: devLogsQuery.isFetchingNextPage,
    fetchNextPage: () => {
      devLogsQuery.fetchNextPage();
    },
    submit: (input, editingId, onDone) => {
      if (editingId) {
        updateDevLog.mutate(
          { path: { id: editingId }, body: input },
          { onSuccess: onDone },
        );
      } else {
        createDevLog.mutate({ body: input }, { onSuccess: onDone });
      }
    },
    remove: (id) => {
      deleteDevLog.mutate({ path: { id } });
    },
    resetForm: () => {
      createDevLog.reset();
      updateDevLog.reset();
    },
  };
};

export const useGuestDevLogController = (filter: DevLogFilter): DevLogController => {
  const guest = useGuestDevLogs(filter.search, filter.tag, filter.period);

  return {
    devLogs: guest.devLogs,
    popularTags: guest.popularTags,
    streakIcon: null,
    isLoading: false,
    listError: null,
    bannerError: guest.deleteError,
    formError: guest.formError,
    isSubmitting: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
    submit: (input, editingId, onDone) => {
      const succeeded = editingId ? guest.update(editingId, input) : guest.create(input);
      if (succeeded) onDone();
    },
    remove: (id) => {
      guest.remove(id);
    },
    resetForm: () => {
      guest.clearFormError();
    },
  };
};
