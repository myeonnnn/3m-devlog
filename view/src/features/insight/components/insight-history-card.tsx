import { Insight } from '../types';
import { formatPeriodLabel } from '../rules/period-key';

interface InsightHistoryCardProps {
  label: string;
  insight: Insight | null | undefined;
}

export function InsightHistoryCard({ label, insight }: InsightHistoryCardProps) {
  return (
    <div>
      <p className="text-sm text-dim">$ devlog insight --{label}</p>
      {insight ? (
        <div className="mt-2 space-y-2 text-sm">
          <p className="text-dim">{formatPeriodLabel(insight.periodType, insight.periodKey)}</p>
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
      ) : (
        <p className="mt-2 text-sm text-dim">아직 생성한 인사이트가 없습니다.</p>
      )}
    </div>
  );
}
