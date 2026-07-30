'use client';

import { useEffect, useState } from 'react';
import { guestStorage } from '../api/guest-storage';
import {
  CreateDevLogInput,
  DevLog,
  DevLogPeriod,
  PopularTag,
  UpdateDevLogInput,
} from '../types';

export function useGuestDevLogs(
  search: string | undefined,
  tag: string | undefined,
  period?: DevLogPeriod,
) {
  const [version, setVersion] = useState(0);
  // 삭제 에러(배너)와 생성/수정 에러(폼)를 분리 — 인증 모드는 deleteDevLog/
  // createDevLog/updateDevLog가 이미 서로 다른 뮤테이션이라 자연히 분리되는데,
  // 게스트 모드는 하나의 error로 합쳐두면 생성 실패가 목록 에러·삭제 배너에도
  // 잘못 나타난다.
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // localStorage는 브라우저 전용이라 SSR 결과와 다를 수 있다. 서버/클라이언트
  // 첫 렌더는 항상 빈 배열로 맞추고, 마운트 후 아래 effect에서 실제 값으로
  // 동기화해 hydration mismatch를 피한다.
  const [logs, setLogs] = useState<DevLog[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);

  useEffect(() => {
    // 브라우저 전용 API(localStorage)를 마운트 이후에 동기화하는 케이스라
    // set-state-in-effect 룰의 정당한 예외에 해당한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLogs(guestStorage.list({ search, tag, period }));
    setPopularTags(guestStorage.popularTags());
  }, [search, tag, period, version]);

  function refresh() {
    setVersion((v) => v + 1);
  }

  return {
    devLogs: logs,
    popularTags,
    deleteError,
    formError,
    create(input: CreateDevLogInput): boolean {
      try {
        guestStorage.create(input);
        setFormError(null);
        refresh();
        return true;
      } catch {
        setFormError('브라우저 저장 공간이 부족해서 저장하지 못했어요.');
        return false;
      }
    },
    update(id: string, input: UpdateDevLogInput): boolean {
      try {
        guestStorage.update(id, input);
        setFormError(null);
        refresh();
        return true;
      } catch (err) {
        setFormError(err instanceof Error ? err.message : '수정에 실패했어요.');
        return false;
      }
    },
    remove(id: string) {
      try {
        guestStorage.remove(id);
        setDeleteError(null);
        refresh();
      } catch {
        setDeleteError('삭제에 실패했어요.');
      }
    },
    clearFormError() {
      setFormError(null);
    },
  };
}
