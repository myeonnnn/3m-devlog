import { InsightPeriodType } from '../types';

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

function parseWeeklyKey(periodKey: string): { isoYear: number; isoWeek: number } {
  const [yearStr, weekStr] = periodKey.split('-W');
  return { isoYear: Number(yearStr), isoWeek: Number(weekStr) };
}

function parseMonthlyKey(periodKey: string): { year: number; month: number } {
  const [yearStr, monthStr] = periodKey.split('-');
  return { year: Number(yearStr), month: Number(monthStr) };
}

export function currentPeriodKey(periodType: InsightPeriodType, now = new Date()): string {
  if (periodType === 'WEEKLY') {
    const { isoYear, isoWeek } = getIsoWeek(now);
    return `${isoYear}-W${pad2(isoWeek)}`;
  }
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`;
}

/** periodKey는 항상 zero-padded 고정폭 형식이라 문자열 비교로 미래 여부를 안전하게 판단할 수 있다. */
export function isFuturePeriodKey(
  periodType: InsightPeriodType,
  periodKey: string,
  now = new Date(),
): boolean {
  return periodKey > currentPeriodKey(periodType, now);
}

export function shiftPeriodKey(
  periodType: InsightPeriodType,
  periodKey: string,
  delta: number,
): string {
  if (periodType === 'MONTHLY') {
    const { year, month } = parseMonthlyKey(periodKey);
    const total = year * 12 + (month - 1) + delta;
    const nextYear = Math.floor(total / 12);
    const nextMonth = ((total % 12) + 12) % 12;
    return `${nextYear}-${pad2(nextMonth + 1)}`;
  }

  const { isoYear, isoWeek } = parseWeeklyKey(periodKey);
  const start = isoWeekMonday(isoYear, isoWeek);
  start.setUTCDate(start.getUTCDate() + delta * 7);
  const next = getIsoWeek(start);
  return `${next.isoYear}-W${pad2(next.isoWeek)}`;
}

function formatMonthDay(date: Date): string {
  return `${pad2(date.getUTCMonth() + 1)}/${pad2(date.getUTCDate())}`;
}

export function formatPeriodLabel(periodType: InsightPeriodType, periodKey: string): string {
  if (periodType === 'MONTHLY') {
    const { year, month } = parseMonthlyKey(periodKey);
    return `${year}년 ${month}월`;
  }

  const { isoYear, isoWeek } = parseWeeklyKey(periodKey);
  const start = isoWeekMonday(isoYear, isoWeek);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${periodKey} (${formatMonthDay(start)}~${formatMonthDay(end)})`;
}
