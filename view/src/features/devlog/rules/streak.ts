// 정책: 연속 기록 단계 전환 기준(일수). docs/policies.md "목록 조회 / 연속 기록" 참고.
const STREAK_STAGE_DAYS = {
  TREE: 14,
  POT: 7,
  SPROUT: 3,
  SEED: 1,
} as const;

/** 연속 기록 일수(days)에 대응하는 배지 아이콘. 기록이 없으면(0 이하) 배지를 숨긴다. */
export function resolveStreakIcon(days: number): string | null {
  if (days >= STREAK_STAGE_DAYS.TREE) return '🌳';
  if (days >= STREAK_STAGE_DAYS.POT) return '🪴';
  if (days >= STREAK_STAGE_DAYS.SPROUT) return '🌿';
  if (days >= STREAK_STAGE_DAYS.SEED) return '🌱';
  return null;
}
