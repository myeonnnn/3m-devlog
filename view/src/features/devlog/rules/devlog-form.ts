import { toDateInputValue } from '@/utils/date';

export const MAX_TAGS = 5;

// REVISIT: devlog-card.tsx에도 동일한 구현의 toLogFilename이 있어(총 3번째 등장).
// Rule of Three 기준으로는 devlog-card.tsx도 이 유틸을 같이 쓰도록 정리하는 게 맞지만,
// 이번 작업 범위가 devlog-form-modal.tsx로 한정돼 있어 devlog-card.tsx는 건드리지 않음.
export const toLogFilename = (date: string) => toDateInputValue(new Date(date));

export const maxLogDate = toDateInputValue(new Date());
export const minLogDate = (() => {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return toDateInputValue(oneMonthAgo);
})();

export const normalizeTag = (raw: string) => raw.trim().replace(/^#/, '');

export const validateDevLogForm = (
  learnedNote: string,
  logDate: string,
  minLogDate: string,
  maxLogDate: string,
): string | null => {
  if (!learnedNote.trim()) {
    return '오늘 배운 점은 필수 입력이에요.';
  }
  if (logDate < minLogDate || logDate > maxLogDate) {
    return '날짜는 오늘부터 과거 최대 1개월 이내여야 해요.';
  }
  return null;
};
