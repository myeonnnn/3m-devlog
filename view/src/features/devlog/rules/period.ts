import { DevLogPeriod } from '../types';
import { toDateInputValue } from '@/utils/date';

const PERIOD_DAYS: Record<'recent7' | 'recent30', number> = {
  recent7: 7,
  recent30: 30,
};

/**
 * period에 해당하는 최소 logDate(YYYY-MM-DD)를 반환한다. "최근 N일"은 오늘을 포함하므로
 * 오늘부터 (N - 1)일 전까지가 컷오프. period가 없거나 'all'이면 컷오프 없음(null).
 */
export function resolvePeriodCutoff(period: DevLogPeriod | undefined, now = new Date()): string | null {
  if (!period || period === 'all') return null;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (PERIOD_DAYS[period] - 1));
  return toDateInputValue(cutoff);
}
