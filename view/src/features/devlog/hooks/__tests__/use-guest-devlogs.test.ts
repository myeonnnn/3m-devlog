import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGuestDevLogs } from '../use-guest-devlogs';

describe('useGuestDevLogs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('create()가 성공하면 true를 반환하고 formError는 null로 유지된다', () => {
    const { result } = renderHook(() => useGuestDevLogs(undefined, undefined));

    let success: boolean | undefined;
    act(() => {
      success = result.current.create({ logDate: '2026-07-30', learnedNote: '배운 것' });
    });

    expect(success).toBe(true);
    expect(result.current.formError).toBeNull();
    expect(result.current.devLogs).toHaveLength(1);
  });

  it('update()가 존재하지 않는 id에 대해 false를 반환하고 구체적인 에러 메시지를 남긴다', () => {
    const { result } = renderHook(() => useGuestDevLogs(undefined, undefined));

    let success: boolean | undefined;
    act(() => {
      success = result.current.update('nonexistent', { learnedNote: '수정' });
    });

    expect(success).toBe(false);
    expect(result.current.formError).toBe('게스트 로그를 찾을 수 없어요.');
  });

  describe('localStorage 쓰기가 실패할 때', () => {
    beforeEach(() => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('create()가 false를 반환하고 formError를 설정한다', () => {
      const { result } = renderHook(() => useGuestDevLogs(undefined, undefined));

      let success: boolean | undefined;
      act(() => {
        success = result.current.create({ logDate: '2026-07-30', learnedNote: '배운 것' });
      });

      expect(success).toBe(false);
      expect(result.current.formError).toBe('브라우저 저장 공간이 부족해서 저장하지 못했어요.');
    });

    it('remove()는 formError가 아니라 deleteError를 설정한다', () => {
      const { result } = renderHook(() => useGuestDevLogs(undefined, undefined));

      act(() => {
        result.current.remove('some-id');
      });

      expect(result.current.deleteError).toBe('삭제에 실패했어요.');
      expect(result.current.formError).toBeNull();
    });
  });

  it('clearFormError()는 deleteError는 건드리지 않고 formError만 초기화한다', () => {
    const { result } = renderHook(() => useGuestDevLogs(undefined, undefined));

    act(() => {
      result.current.update('nonexistent', { learnedNote: '수정' });
    });
    expect(result.current.formError).not.toBeNull();

    act(() => {
      result.current.clearFormError();
    });
    expect(result.current.formError).toBeNull();
  });
});
