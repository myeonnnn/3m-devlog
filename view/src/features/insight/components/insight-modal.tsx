'use client';

import { InsightController } from '../hooks/use-insight-controller';
import { InsightPeriodType } from '../types';
import { Button } from '@/components/button';

interface InsightModalProps {
  controller: InsightController;
  onClose: () => void;
}

const PERIOD_TYPE_LABEL: Record<InsightPeriodType, string> = {
  WEEKLY: '주간',
  MONTHLY: '월간',
};

export function InsightModal({ controller, onClose }: InsightModalProps) {
  const {
    periodType,
    periodLabel,
    canGoNext,
    insight,
    isLoading,
    isGenerating,
    isEmptyPeriod,
    isError,
    switchPeriodType,
    shiftPeriod,
    generate,
  } = controller;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:bg-black/70 sm:p-4">
      <div className="flex h-full flex-col overflow-y-auto border-line bg-panel p-5 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:border">
        <p className="text-sm text-dim">$ devlog insight</p>

        <div className="mt-4 flex gap-2">
          {(Object.keys(PERIOD_TYPE_LABEL) as InsightPeriodType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => switchPeriodType(type)}
              className={`min-h-11 border px-3 text-sm ${
                periodType === type
                  ? 'border-signal text-signal'
                  : 'border-line text-dim hover:text-text'
              }`}
            >
              {PERIOD_TYPE_LABEL[type]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            aria-label="이전 기간"
            className="text-dim hover:text-signal"
          >
            ‹
          </button>
          <span className="text-text">{periodLabel}</span>
          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            disabled={!canGoNext}
            aria-label="다음 기간"
            className="text-dim hover:text-signal disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="mt-4 flex-1">
          {isLoading && <p className="text-sm text-dim">불러오는 중...</p>}
          {isGenerating && <p className="text-sm text-dim">AI가 회고를 작성하는 중...</p>}
          {isEmptyPeriod && <p className="text-sm text-dim">이 기간에 기록이 없습니다.</p>}
          {isError && (
            <p className="text-sm text-danger">인사이트 생성에 실패했어요, 다시 시도해주세요.</p>
          )}
          {insight && (
            <div className="space-y-3 text-sm">
              <p className="text-text">{insight.summary}</p>
              {insight.patterns.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-dim">
                  {insight.patterns.map((pattern) => (
                    <li key={pattern}>{pattern}</li>
                  ))}
                </ul>
              )}
              <p className="text-dim">기록 {insight.logCount}건</p>
            </div>
          )}
        </div>

        <div className="mt-auto flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose}>
            [ 닫기 ]
          </Button>
          <Button variant="signal" onClick={generate} disabled={isGenerating || isLoading}>
            {isGenerating ? '[ 생성 중... ]' : insight ? '[ 재생성 ]' : '[ 생성하기 ]'}
          </Button>
        </div>
      </div>
    </div>
  );
}
