import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { InsightController } from '../../hooks/use-insight-controller';
import { InsightModal } from '../insight-modal';

function buildController(overrides: Partial<InsightController> = {}): InsightController {
  return {
    periodType: 'WEEKLY',
    periodLabel: '2026-W31 (07/27~08/02)',
    canGoNext: true,
    insight: undefined,
    isLoading: false,
    isGenerating: false,
    isEmptyPeriod: false,
    isError: false,
    switchPeriodType: vi.fn(),
    shiftPeriod: vi.fn(),
    generate: vi.fn(),
    ...overrides,
  };
}

describe('InsightModal', () => {
  it('canGoNext가 false면 다음 기간 버튼이 비활성화된다', () => {
    render(<InsightModal controller={buildController({ canGoNext: false })} onClose={() => {}} />);
    expect(screen.getByLabelText('다음 기간')).toBeDisabled();
  });

  it('canGoNext가 true면 다음 기간 버튼이 활성화된다', () => {
    render(<InsightModal controller={buildController({ canGoNext: true })} onClose={() => {}} />);
    expect(screen.getByLabelText('다음 기간')).toBeEnabled();
  });

  it('빈 기간(422) 상태면 안내 문구를 보여준다', () => {
    render(<InsightModal controller={buildController({ isEmptyPeriod: true })} onClose={() => {}} />);
    expect(screen.getByText('이 기간에 기록이 없습니다.')).toBeInTheDocument();
  });

  it('실패 상태면 재시도 안내 문구를 보여준다', () => {
    render(<InsightModal controller={buildController({ isError: true })} onClose={() => {}} />);
    expect(
      screen.getByText('인사이트 생성에 실패했어요, 다시 시도해주세요.'),
    ).toBeInTheDocument();
  });

  it('생성 결과가 있으면 요약/패턴/기록 수를 보여준다', () => {
    render(
      <InsightModal
        controller={buildController({
          insight: {
            id: '1',
            ownerId: 'owner',
            periodType: 'WEEKLY',
            periodKey: '2026-W31',
            summary: '이번 주 요약',
            patterns: ['반복 패턴 A'],
            logCount: 3,
            generatedAt: '2026-08-01T00:00:00.000Z',
          },
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('이번 주 요약')).toBeInTheDocument();
    expect(screen.getByText('반복 패턴 A')).toBeInTheDocument();
    expect(screen.getByText('기록 3건')).toBeInTheDocument();
  });

  it('생성하기 버튼 클릭 시 controller.generate를 호출한다', async () => {
    const controller = buildController();
    render(<InsightModal controller={controller} onClose={() => {}} />);
    await userEvent.click(screen.getByText('[ 생성하기 ]'));
    expect(controller.generate).toHaveBeenCalledTimes(1);
  });

  it('저장된 결과 조회 중이면 불러오는 중 문구를 보여준다', () => {
    render(<InsightModal controller={buildController({ isLoading: true })} onClose={() => {}} />);
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
  });

  it('이미 저장된 결과가 있으면 버튼 라벨이 재생성으로 바뀐다', () => {
    render(
      <InsightModal
        controller={buildController({
          insight: {
            id: '1',
            ownerId: 'owner',
            periodType: 'WEEKLY',
            periodKey: '2026-W31',
            summary: '이번 주 요약',
            patterns: [],
            logCount: 1,
            generatedAt: '2026-08-01T00:00:00.000Z',
          },
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('[ 재생성 ]')).toBeInTheDocument();
  });

  it('주간/월간 토글 클릭 시 controller.switchPeriodType를 호출한다', async () => {
    const controller = buildController();
    render(<InsightModal controller={controller} onClose={() => {}} />);
    await userEvent.click(screen.getByText('월간'));
    expect(controller.switchPeriodType).toHaveBeenCalledWith('MONTHLY');
  });
});
