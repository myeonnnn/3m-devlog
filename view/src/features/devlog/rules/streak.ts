/** 연속 기록 일수(days)에 대응하는 배지 아이콘. 기록이 없으면(0 이하) 배지를 숨긴다. */
export function resolveStreakIcon(days: number): string | null {
  if (days >= 14) return '🌳';
  if (days >= 7) return '🪴';
  if (days >= 3) return '🌿';
  if (days >= 1) return '🌱';
  return null;
}
