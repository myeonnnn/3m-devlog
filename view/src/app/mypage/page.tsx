'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStatsQuery } from '@/features/devlog';
import {
  PROVIDER_LABEL,
  useDeleteAccount,
  useLogout,
  useMeQuery,
} from '@/features/auth';
import { Button } from '@/components/button';

export default function MyPage() {
  const router = useRouter();
  const meQuery = useMeQuery();
  const statsQuery = useStatsQuery({ enabled: !!meQuery.data });
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();

  if (meQuery.isLoading) {
    return null;
  }

  if (!meQuery.data) {
    router.replace('/');
    return null;
  }

  const user = meQuery.data;

  function handleDeleteAccount() {
    const confirmed = confirm(
      '정말로 계정을 삭제할까요? 계정과 작성한 모든 로그가 영구적으로 삭제되며 복구할 수 없어요.',
    );
    if (!confirmed) return;
    deleteAccount.mutate(undefined, {
      onSuccess: () => router.replace('/'),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">
      <Link href="/" className="text-sm text-dim hover:text-signal">
        &lt; 뒤로
      </Link>

      <div>
        <p className="text-sm text-dim">$ devlog whoami</p>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-signal">email&gt;</dt>
            <dd className="text-text">{user.email ?? '비공개'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-signal">name&gt;</dt>
            <dd className="text-text">{user.displayName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-signal">login&gt;</dt>
            <dd className="text-text">{PROVIDER_LABEL[user.provider]}</dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="text-sm text-dim">$ devlog stats</p>
        {statsQuery.isLoading ? (
          <p className="mt-2 text-sm text-dim">loading...</p>
        ) : (
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-signal">total&gt;</dt>
              <dd className="text-text">
                {statsQuery.data?.totalCount ?? 0}개
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-signal">tags&gt;</dt>
              <dd className="flex flex-wrap gap-x-3 text-text">
                {statsQuery.data && statsQuery.data.topTags.length > 0 ? (
                  statsQuery.data.topTags.map(({ tag, count }) => (
                    <span key={tag}>
                      #{tag}
                      <span className="text-dim"> {count}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-dim">아직 없음</span>
                )}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
        <Button onClick={() => logout.mutate()}>[ 로그아웃 ]</Button>
        <Button
          variant="danger"
          onClick={handleDeleteAccount}
          disabled={deleteAccount.isPending}
        >
          {deleteAccount.isPending ? '[ 삭제 중... ]' : '[ 회원탈퇴 ]'}
        </Button>
      </div>

      {deleteAccount.isError && (
        <p className="text-sm text-danger">
          $ error: 회원탈퇴에 실패했어요 — {deleteAccount.error.message}
        </p>
      )}
    </main>
  );
}
