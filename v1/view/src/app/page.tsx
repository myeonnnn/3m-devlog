'use client';

import { useState } from 'react';
import { DevLog } from '@/lib/types';
import {
  useCreateDevLog,
  useDeleteDevLog,
  useDevLogsQuery,
  usePopularTagsQuery,
  useUpdateDevLog,
} from '@/hooks/use-devlogs';
import { SearchBar } from '@/components/devlog/search-bar';
import { TagChips } from '@/components/devlog/tag-chips';
import { DevLogList } from '@/components/devlog/devlog-list';
import { DevLogFormModal } from '@/components/devlog/devlog-form-modal';
import { LoginScreen } from '@/components/auth/login-screen';
import { useMeQuery, useLogout } from '@/hooks/use-auth';

export default function Home() {
  const meQuery = useMeQuery();
  const logout = useLogout();

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingDevLog, setEditingDevLog] = useState<DevLog | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const devLogsQuery = useDevLogsQuery({
    search: search || undefined,
    tag: activeTag || undefined,
  });
  const popularTagsQuery = usePopularTagsQuery();

  const createDevLog = useCreateDevLog();
  const updateDevLog = useUpdateDevLog();
  const deleteDevLog = useDeleteDevLog();

  const mutation = editingDevLog ? updateDevLog : createDevLog;

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
    createDevLog.reset();
    updateDevLog.reset();
  }

  function handleDelete(devLog: DevLog) {
    if (!confirm('이 로그를 삭제할까요?')) return;
    deleteDevLog.mutate(devLog.id);
  }

  if (meQuery.isLoading) {
    return null;
  }

  if (!meQuery.data) {
    return <LoginScreen />;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">
            3분 개발 로그
          </h1>
          <p className="text-sm text-neutral-400">
            {meQuery.data.displayName}님{' '}
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="underline hover:text-neutral-100"
            >
              로그아웃
            </button>
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-emerald-400"
        >
          작성하기
        </button>
      </header>

      <SearchBar onSearch={setSearch} />

      <TagChips
        tags={popularTagsQuery.data ?? []}
        activeTag={activeTag}
        onSelect={setActiveTag}
      />

      {deleteDevLog.isError && (
        <p className="text-sm text-red-400">
          삭제에 실패했어요: {deleteDevLog.error.message}
        </p>
      )}

      <DevLogList
        devLogs={devLogsQuery.data ?? []}
        isLoading={devLogsQuery.isLoading}
        error={devLogsQuery.error}
        onEdit={openEditForm}
        onDelete={handleDelete}
      />

      {isFormOpen && (
        <DevLogFormModal
          initial={editingDevLog}
          isSubmitting={mutation.isPending}
          error={mutation.error?.message ?? null}
          onClose={closeForm}
          onSubmit={(input) => {
            if (editingDevLog) {
              updateDevLog.mutate(
                { id: editingDevLog.id, input },
                { onSuccess: closeForm },
              );
            } else {
              createDevLog.mutate(input, { onSuccess: closeForm });
            }
          }}
        />
      )}
    </main>
  );
}
