import { CreateDevLogInput, DevLog, DevLogFilter, PopularTag } from '../types';
import {
  useCreateDevLog,
  useDeleteDevLog,
  useDevLogsQuery,
  usePopularTagsQuery,
  useUpdateDevLog,
} from './use-devlogs';
import { useGuestDevLogs } from './use-guest-devlogs';

// isAuthed 여부가 데이터 소스/뮤테이션/렌더링을 여러 곳에서 갈라놓던 것을
// 분기별 컨트롤러 하나로 모아, 호출부에서는 컨트롤러 선택 지점 하나만 남긴다.
export interface DevLogController {
  devLogs: DevLog[];
  popularTags: PopularTag[];
  isLoading: boolean;
  listError: Error | null;
  bannerError: string | null;
  formError: string | null;
  isSubmitting: boolean;
  submit: (input: CreateDevLogInput, editing: DevLog | null, onDone: () => void) => void;
  remove: (devLog: DevLog) => void;
  resetForm: () => void;
}

export const useAuthedDevLogController = (
  filter: DevLogFilter,
  enabled: boolean,
): DevLogController => {
  const devLogsQuery = useDevLogsQuery(filter, { enabled });
  const popularTagsQuery = usePopularTagsQuery({ enabled });
  const createDevLog = useCreateDevLog();
  const updateDevLog = useUpdateDevLog();
  const deleteDevLog = useDeleteDevLog();

  return {
    devLogs: devLogsQuery.data ?? [],
    popularTags: popularTagsQuery.data ?? [],
    isLoading: devLogsQuery.isLoading,
    listError: devLogsQuery.error,
    bannerError: deleteDevLog.isError
      ? `삭제에 실패했어요 — ${deleteDevLog.error.message}`
      : null,
    formError: createDevLog.error?.message ?? updateDevLog.error?.message ?? null,
    isSubmitting: createDevLog.isPending || updateDevLog.isPending,
    submit: (input, editing, onDone) => {
      if (editing) {
        updateDevLog.mutate({ id: editing.id, input }, { onSuccess: onDone });
      } else {
        createDevLog.mutate(input, { onSuccess: onDone });
      }
    },
    remove: (devLog) => {
      deleteDevLog.mutate(devLog.id);
    },
    resetForm: () => {
      createDevLog.reset();
      updateDevLog.reset();
    },
  };
};

export const useGuestDevLogController = (filter: DevLogFilter): DevLogController => {
  const guest = useGuestDevLogs(filter.search, filter.tag);

  return {
    devLogs: guest.devLogs,
    popularTags: guest.popularTags,
    isLoading: false,
    listError: null,
    bannerError: guest.deleteError,
    formError: guest.formError,
    isSubmitting: false,
    submit: (input, editing, onDone) => {
      const succeeded = editing ? guest.update(editing.id, input) : guest.create(input);
      if (succeeded) onDone();
    },
    remove: (devLog) => {
      guest.remove(devLog.id);
    },
    resetForm: () => {
      guest.clearFormError();
    },
  };
};
