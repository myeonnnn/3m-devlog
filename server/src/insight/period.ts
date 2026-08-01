import { BadRequestException } from '@nestjs/common';
import { InsightPeriodType } from '../../generated/prisma/enums';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** ISO 8601 주차: 그 날짜가 속한 주의 목요일이 속한 연도를 ISO 연도로 삼는다. */
function getIsoWeek(date: Date): { isoYear: number; isoWeek: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear, isoWeek };
}

/** ISO 연도의 1/4일은 항상 그 연도 1주차에 속한다는 규칙으로 N주차의 월요일(UTC 00:00)을 구한다. */
function isoWeekMonday(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return start;
}

export function currentPeriodKey(periodType: InsightPeriodType, now = new Date()): string {
  if (periodType === InsightPeriodType.WEEKLY) {
    const { isoYear, isoWeek } = getIsoWeek(now);
    return `${isoYear}-W${pad2(isoWeek)}`;
  }
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`;
}

export interface PeriodRange {
  start: Date;
  end: Date; // 배타적 상한
}

/** periodKey 형식/미래 여부를 검증하고 조회용 [start, end) 날짜 범위를 반환한다. */
export function resolvePeriodRange(
  periodType: InsightPeriodType,
  periodKey: string,
  now = new Date(),
): PeriodRange {
  return periodType === InsightPeriodType.WEEKLY
    ? resolveWeeklyRange(periodKey, now)
    : resolveMonthlyRange(periodKey, now);
}

function assertNotFuture(periodType: InsightPeriodType, periodKey: string, now: Date) {
  // periodKey가 항상 zero-padded 고정폭 형식이라 문자열 비교로 미래 여부를 안전하게 판단할 수 있다.
  if (periodKey > currentPeriodKey(periodType, now)) {
    throw new BadRequestException('미래 기간은 선택할 수 없어요.');
  }
}

function resolveWeeklyRange(periodKey: string, now: Date): PeriodRange {
  const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  const isoWeek = match ? Number(match[2]) : NaN;
  if (!match || isoWeek < 1 || isoWeek > 53) {
    throw new BadRequestException('periodKey 형식이 올바르지 않아요. 예: 2026-W31');
  }
  assertNotFuture(InsightPeriodType.WEEKLY, periodKey, now);

  const isoYear = Number(match[1]);
  const start = isoWeekMonday(isoYear, isoWeek);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function resolveMonthlyRange(periodKey: string, now: Date): PeriodRange {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
  const month = match ? Number(match[2]) : NaN;
  if (!match || month < 1 || month > 12) {
    throw new BadRequestException('periodKey 형식이 올바르지 않아요. 예: 2026-08');
  }
  assertNotFuture(InsightPeriodType.MONTHLY, periodKey, now);

  const year = Number(match[1]);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}
