import { describe, expect, it } from 'vitest';
import { toDateInputValue } from '../date';

describe('toDateInputValue', () => {
  it('날짜를 YYYY-MM-DD 형식으로 변환한다', () => {
    expect(toDateInputValue(new Date('2026-07-30T09:00:00.000Z'))).toBe('2026-07-30');
  });

  it('시:분:초는 버리고 날짜 부분만 남긴다', () => {
    expect(toDateInputValue(new Date('2026-01-05T23:59:59.999Z'))).toBe('2026-01-05');
  });
});
