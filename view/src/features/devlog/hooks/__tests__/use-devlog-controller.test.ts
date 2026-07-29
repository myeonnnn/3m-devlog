import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DevLog } from '../../types';
import { useGuestDevLogController } from '../use-devlog-controller';

const fakeDevLog: DevLog = {
  id: 'nonexistent',
  ownerId: 'guest',
  logDate: '2026-07-30',
  learnedNote: '기존 내용',
  troubleshootingNote: null,
  tomorrowTask: null,
  tags: [],
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
};

describe('useGuestDevLogController', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('submit(생성)이 성공하면 onDone을 호출한다', () => {
    const { result } = renderHook(() => useGuestDevLogController({}));
    const onDone = vi.fn();

    act(() => {
      result.current.submit({ logDate: '2026-07-30', learnedNote: '배운 것' }, null, onDone);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  // 회귀 테스트: 이전엔 guest submit이 성공/실패와 무관하게 항상 onDone(폼 닫기)을
  // 호출해서, 저장 실패 시에도 모달이 닫혀버려 formError를 볼 수 없었다.
  it('submit(수정)이 실패하면 onDone을 호출하지 않고 에러를 남긴다', () => {
    const { result } = renderHook(() => useGuestDevLogController({}));
    const onDone = vi.fn();

    act(() => {
      result.current.submit(
        { logDate: '2026-07-30', learnedNote: '수정된 내용' },
        fakeDevLog, // 저장소에 없는 id라서 update가 실패한다
        onDone,
      );
    });

    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.formError).toBe('게스트 로그를 찾을 수 없어요.');
  });

  it('resetForm()이 실패한 submit에서 남은 formError를 초기화한다', () => {
    const { result } = renderHook(() => useGuestDevLogController({}));

    act(() => {
      result.current.submit({ logDate: '2026-07-30', learnedNote: '수정된 내용' }, fakeDevLog, vi.fn());
    });
    expect(result.current.formError).not.toBeNull();

    act(() => {
      result.current.resetForm();
    });
    expect(result.current.formError).toBeNull();
  });
});
