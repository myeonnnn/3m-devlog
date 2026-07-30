import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DevLog } from '../../types';
import { DevLogList } from '../devlog-list';

const devLog: DevLog = {
  id: '1',
  ownerId: 'owner',
  logDate: '2026-07-30',
  learnedNote: '배운 것',
  troubleshootingNote: null,
  tomorrowTask: null,
  tags: [],
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
};

describe('DevLogList', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hasNextPage가 true일 때만 sentinel을 렌더한다', () => {
    const { rerender, container } = render(
      <DevLogList
        devLogs={[devLog]}
        isLoading={false}
        error={null}
        onEdit={() => {}}
        onDelete={() => {}}
        hasNextPage={false}
      />,
    );
    expect(container.querySelectorAll('div[aria-hidden="true"]')).toHaveLength(0);

    rerender(
      <DevLogList
        devLogs={[devLog]}
        isLoading={false}
        error={null}
        onEdit={() => {}}
        onDelete={() => {}}
        hasNextPage
      />,
    );
    // sentinel div는 마지막 카드 뒤에 aria-hidden으로 붙는다
    const sentinels = container.querySelectorAll('div[aria-hidden="true"]');
    expect(sentinels.length).toBeGreaterThan(0);
  });

  it('isFetchingNextPage일 때 로딩 텍스트를 보여준다', () => {
    render(
      <DevLogList
        devLogs={[devLog]}
        isLoading={false}
        error={null}
        onEdit={() => {}}
        onDelete={() => {}}
        hasNextPage
        isFetchingNextPage
      />,
    );
    expect(screen.getByText('$ loading more...')).toBeInTheDocument();
  });
});
