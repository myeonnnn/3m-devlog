'use client';

import { useEffect, useState } from 'react';
import { guestStorage } from '@/lib/guest-storage';
import {
  CreateDevLogInput,
  DevLog,
  PopularTag,
  UpdateDevLogInput,
} from '@/lib/types';

export function useGuestDevLogs(search: string | undefined, tag: string | undefined) {
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // localStorage는 브라우저 전용이라 SSR 결과와 다를 수 있다. 서버/클라이언트
  // 첫 렌더는 항상 빈 배열로 맞추고, 마운트 후 아래 effect에서 실제 값으로
  // 동기화해 hydration mismatch를 피한다.
  const [logs, setLogs] = useState<DevLog[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);

  useEffect(() => {
    // 브라우저 전용 API(localStorage)를 마운트 이후에 동기화하는 케이스라
    // set-state-in-effect 룰의 정당한 예외에 해당한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLogs(guestStorage.list({ search, tag }));
    setPopularTags(guestStorage.popularTags());
  }, [search, tag, version]);

  function refresh() {
    setError(null);
    setVersion((v) => v + 1);
  }

  return {
    devLogs: logs,
    popularTags,
    error,
    create(input: CreateDevLogInput) {
      try {
        guestStorage.create(input);
        refresh();
      } catch {
        setError('브라우저 저장 공간이 부족해서 저장하지 못했어요.');
      }
    },
    update(id: string, input: UpdateDevLogInput) {
      try {
        guestStorage.update(id, input);
        refresh();
      } catch {
        setError('수정에 실패했어요.');
      }
    },
    remove(id: string) {
      try {
        guestStorage.remove(id);
        refresh();
      } catch {
        setError('삭제에 실패했어요.');
      }
    },
  };
}
