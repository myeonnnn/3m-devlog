'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DevLog } from '@/lib/types';
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
import { useMeQuery, useLogout } from '@/hooks/use-auth';

export default function Home() {
  const meQuery = useMeQuery();
  const logout = useLogout();
  const isAuthed = !!meQuery.data;

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingDevLog, setEditingDevLog] = useState<DevLog | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const devLogsQuery = useDevLogsQuery(
    { search: search || undefined, tag: activeTag || undefined },
    { enabled: isAuthed },
  );
  const popularTagsQuery = usePopularTagsQuery({ enabled: isAuthed });
  const guest = useGuestDevLogs(search || undefined, activeTag || undefined);

  const createDevLog = useCreateDevLog();
  const updateDevLog = useUpdateDevLog();
  const deleteDevLog = useDeleteDevLog();

  const mutation = editingDevLog ? updateDevLog : createDevLog;

  const devLogs = isAuthed ? (devLogsQuery.data ?? []) : guest.devLogs;
  const popularTags = isAuthed ? (popularTagsQuery.data ?? []) : guest.popularTags;
  const listError = isAuthed
    ? devLogsQuery.error
    : guest.error
      ? new Error(guest.error)
      : null;

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
    if (isAuthed) {
      deleteDevLog.mutate(devLog.id);
    } else {
      guest.remove(devLog.id);
    }
  }

  if (meQuery.isLoading) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">3m-devlog</h1>
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

      <TagChips tags={popularTags} activeTag={activeTag} onSelect={setActiveTag} />

      {isAuthed && deleteDevLog.isError && (
        <p className="text-sm text-danger">
          $ error: 삭제에 실패했어요 — {deleteDevLog.error.message}
        </p>
      )}
      {!isAuthed && guest.error && (
        <p className="text-sm text-danger">$ error: {guest.error}</p>
      )}

      <DevLogList
        devLogs={devLogs}
        isLoading={isAuthed && devLogsQuery.isLoading}
        error={listError}
        onEdit={openEditForm}
        onDelete={handleDelete}
      />

      {isFormOpen && (
        <DevLogFormModal
          initial={editingDevLog}
          isSubmitting={isAuthed ? mutation.isPending : false}
          error={isAuthed ? (mutation.error?.message ?? null) : guest.error}
          onClose={closeForm}
          onSubmit={(input) => {
            if (isAuthed) {
              if (editingDevLog) {
                updateDevLog.mutate(
                  { id: editingDevLog.id, input },
                  { onSuccess: closeForm },
                );
              } else {
                createDevLog.mutate(input, { onSuccess: closeForm });
              }
            } else {
              if (editingDevLog) {
                guest.update(editingDevLog.id, input);
              } else {
                guest.create(input);
              }
              closeForm();
            }
          }}
        />
      )}
    </main>
  );
}
