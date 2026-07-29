'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreateDevLogInput, DevLog, DevLogFilter, PopularTag } from '@/lib/types';
import {
  useCreateDevLog,
  useDeleteDevLog,
  useDevLogsQuery,
  usePopularTagsQuery,
  useUpdateDevLog,
} from '@/hooks/use-devlogs';
import { useGuestDevLogs } from '@/hooks/use-guest-devlogs';
import { SearchBar } from '@/components/devlog/search-bar';
import { TagChips } from '@/components/devlog/tag-chips';
import { DevLogList } from '@/components/devlog/devlog-list';
import { DevLogFormModal } from '@/components/devlog/devlog-form-modal';
import { GuestBanner } from '@/components/auth/guest-banner';
import { Logo } from '@/components/logo';
import { useMeQuery, useLogout } from '@/hooks/use-auth';

// isAuthed 여부가 데이터 소스/뮤테이션/렌더링을 여러 곳에서 갈라놓던 것을
// 분기별 컨트롤러 하나로 모아, Home()에서는 컨트롤러 선택 지점 하나만 남긴다.
interface DevLogController {
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

function useAuthedDevLogController(filter: DevLogFilter, enabled: boolean): DevLogController {
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
    submit(input, editing, onDone) {
      if (editing) {
        updateDevLog.mutate({ id: editing.id, input }, { onSuccess: onDone });
      } else {
        createDevLog.mutate(input, { onSuccess: onDone });
      }
    },
    remove(devLog) {
      deleteDevLog.mutate(devLog.id);
    },
    resetForm() {
      createDevLog.reset();
      updateDevLog.reset();
    },
  };
}

function useGuestDevLogController(filter: DevLogFilter): DevLogController {
  const guest = useGuestDevLogs(filter.search, filter.tag);

  return {
    devLogs: guest.devLogs,
    popularTags: guest.popularTags,
    isLoading: false,
    listError: guest.error ? new Error(guest.error) : null,
    bannerError: guest.error,
    formError: guest.error,
    isSubmitting: false,
    submit(input, editing, onDone) {
      if (editing) {
        guest.update(editing.id, input);
      } else {
        guest.create(input);
      }
      onDone();
    },
    remove(devLog) {
      guest.remove(devLog.id);
    },
    resetForm() {},
  };
}

export default function Home() {
  const meQuery = useMeQuery();
  const logout = useLogout();
  const isAuthed = !!meQuery.data;

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingDevLog, setEditingDevLog] = useState<DevLog | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filter: DevLogFilter = { search: search || undefined, tag: activeTag || undefined };
  // REVISIT: Rules of Hooks 때문에 authed/guest 컨트롤러 둘 다 매 렌더 무조건 호출된다.
  // 그래서 useAuthedDevLogController는 실제 인증 여부와 무관하게 항상 실행되고, 그 안의
  // react-query가 불필요한 네트워크 요청을 보내지 않으려면 enabled 플래그를 계속
  // 주입받아야 한다. 이걸 완전히 없애려면 Home()을 AuthedHome/GuestHome 두 컴포넌트로
  // 나눠 조건부 렌더링으로 분기해야 하는데, 그러려면 지금 이 UI 상태
  // (search/activeTag/editingDevLog/isFormOpen)와 아래 프레젠테이션 셸을 공유하는 구조를
  // 새로 만들어야 해서 이번 리팩토링 범위를 넘어선다. 트레이드오프만 남겨둔다.
  const authedController = useAuthedDevLogController(filter, isAuthed);
  const guestController = useGuestDevLogController(filter);
  const controller = isAuthed ? authedController : guestController;

  function openCreateForm() {
    setEditingDevLog(null);
    setIsFormOpen(true);
  }

  function openEditForm(devLog: DevLog) {
    setEditingDevLog(devLog);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    controller.resetForm();
  }

  function handleDelete(devLog: DevLog) {
    if (!confirm('이 로그를 삭제할까요?')) return;
    controller.remove(devLog);
  }

  function handleFormSubmit(input: CreateDevLogInput) {
    controller.submit(input, editingDevLog, closeForm);
  }

  if (meQuery.isLoading) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <h1 className="text-xl font-bold text-text">3m-devlog</h1>
          </div>
          {meQuery.data && (
            <p className="text-sm text-dim">
              {meQuery.data.displayName}님{' '}
              <Link href="/mypage" className="text-signal hover:underline">
                mypage
              </Link>{' '}
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="text-signal hover:underline"
              >
                logout
              </button>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="flex h-11 items-center border border-signal px-4 text-sm text-signal"
        >
          [ 새 로그 ]
        </button>
      </header>

      {!isAuthed && <GuestBanner />}

      <SearchBar onSearch={setSearch} />

      <TagChips tags={controller.popularTags} activeTag={activeTag} onSelect={setActiveTag} />

      {controller.bannerError && (
        <p className="text-sm text-danger">$ error: {controller.bannerError}</p>
      )}

      <DevLogList
        devLogs={controller.devLogs}
        isLoading={controller.isLoading}
        error={controller.listError}
        onEdit={openEditForm}
        onDelete={handleDelete}
      />

      {isFormOpen && (
        <DevLogFormModal
          initial={editingDevLog}
          isSubmitting={controller.isSubmitting}
          error={controller.formError}
          onClose={closeForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </main>
  );
}
