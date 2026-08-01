import { BadRequestException } from '@nestjs/common';
import { InsightPeriodType } from '../../generated/prisma/enums';
import { currentPeriodKey, resolvePeriodRange } from './period';

describe('currentPeriodKey', () => {
  it.each([
    ['2026-08-01T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W31'],
    ['2026-01-01T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W01'],
    ['2025-12-31T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W01'], // 해가 바뀌기 전날이 다음 ISO 연도 1주차인 경우
    ['2026-12-31T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W53'], // 2026년은 ISO 53주차가 있음
    ['2027-01-01T00:00:00Z', InsightPeriodType.WEEKLY, '2026-W53'], // 새해 첫날이 전년도 53주차인 경우
    ['2026-08-01T00:00:00Z', InsightPeriodType.MONTHLY, '2026-08'],
    ['2026-12-31T00:00:00Z', InsightPeriodType.MONTHLY, '2026-12'],
  ])('now=%s, periodType=%s -> %s', (now, periodType, expected) => {
    expect(currentPeriodKey(periodType, new Date(now))).toBe(expected);
  });
});

describe('resolvePeriodRange', () => {
  const now = new Date('2026-08-01T00:00:00Z'); // 2026-W31, 2026-08

  it('주간: 형식이 맞으면 월요일~다음 월요일(배타) 범위를 반환한다', () => {
    const { start, end } = resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-W31', now);
    expect(start.toISOString()).toBe('2026-07-27T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-03T00:00:00.000Z');
  });

  it('주간: 연도 경계(2026-W01)도 올바른 월요일을 반환한다', () => {
    const { start } = resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-W01', now);
    expect(start.toISOString()).toBe('2025-12-29T00:00:00.000Z');
  });

  it('월간: 1일~다음달 1일(배타) 범위를 반환한다', () => {
    const { start, end } = resolvePeriodRange(InsightPeriodType.MONTHLY, '2026-08', now);
    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('형식이 잘못된 주간 periodKey는 400', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-8', now)).toThrow(
      BadRequestException,
    );
  });

  it('형식이 잘못된 월간 periodKey는 400', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.MONTHLY, '2026/08', now)).toThrow(
      BadRequestException,
    );
  });

  it('미래 주간 periodKey는 400', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-W32', now)).toThrow(
      BadRequestException,
    );
  });

  it('미래 월간 periodKey는 400', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.MONTHLY, '2026-09', now)).toThrow(
      BadRequestException,
    );
  });

  it('현재(오늘이 속한) 기간은 미래가 아니므로 허용된다', () => {
    expect(() => resolvePeriodRange(InsightPeriodType.WEEKLY, '2026-W31', now)).not.toThrow();
    expect(() => resolvePeriodRange(InsightPeriodType.MONTHLY, '2026-08', now)).not.toThrow();
  });
});
