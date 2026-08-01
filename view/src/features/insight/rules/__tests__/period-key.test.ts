import { describe, expect, it } from 'vitest';
import {
  currentPeriodKey,
  formatPeriodLabel,
  isFuturePeriodKey,
  shiftPeriodKey,
} from '../period-key';

describe('currentPeriodKey', () => {
  it.each([
    ['2026-08-01T00:00:00Z', 'WEEKLY' as const, '2026-W31'],
    ['2025-12-31T00:00:00Z', 'WEEKLY' as const, '2026-W01'],
    ['2026-12-31T00:00:00Z', 'WEEKLY' as const, '2026-W53'],
    ['2027-01-01T00:00:00Z', 'WEEKLY' as const, '2026-W53'],
    ['2026-08-01T00:00:00Z', 'MONTHLY' as const, '2026-08'],
  ])('now=%s, periodType=%s -> %s', (now, periodType, expected) => {
    expect(currentPeriodKey(periodType, new Date(now))).toBe(expected);
  });
});

describe('isFuturePeriodKey', () => {
  const now = new Date('2026-08-01T00:00:00Z'); // 2026-W31, 2026-08

  it('현재 기간은 미래가 아니다', () => {
    expect(isFuturePeriodKey('WEEKLY', '2026-W31', now)).toBe(false);
    expect(isFuturePeriodKey('MONTHLY', '2026-08', now)).toBe(false);
  });

  it('다음 주/월은 미래다', () => {
    expect(isFuturePeriodKey('WEEKLY', '2026-W32', now)).toBe(true);
    expect(isFuturePeriodKey('MONTHLY', '2026-09', now)).toBe(true);
  });

  it('과거 기간은 미래가 아니다', () => {
    expect(isFuturePeriodKey('WEEKLY', '2026-W01', now)).toBe(false);
    expect(isFuturePeriodKey('MONTHLY', '2025-12', now)).toBe(false);
  });
});

describe('shiftPeriodKey', () => {
  it('주간: 연도 경계를 넘어 이동한다', () => {
    expect(shiftPeriodKey('WEEKLY', '2026-W01', -1)).toBe('2025-W52');
    expect(shiftPeriodKey('WEEKLY', '2026-W53', 1)).toBe('2027-W01');
  });

  it('월간: 연도 경계를 넘어 이동한다', () => {
    expect(shiftPeriodKey('MONTHLY', '2026-01', -1)).toBe('2025-12');
    expect(shiftPeriodKey('MONTHLY', '2026-12', 1)).toBe('2027-01');
  });
});

describe('formatPeriodLabel', () => {
  it('월간은 "YYYY년 M월" 형태다', () => {
    expect(formatPeriodLabel('MONTHLY', '2026-08')).toBe('2026년 8월');
  });

  it('주간은 periodKey와 함께 시작~끝 날짜(MM/DD)를 보여준다', () => {
    expect(formatPeriodLabel('WEEKLY', '2026-W31')).toBe('2026-W31 (07/27~08/02)');
  });
});
