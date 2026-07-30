import { describe, expect, it } from 'vitest';
import { resolveStreakIcon } from '../streak';

describe('resolveStreakIcon', () => {
  it.each([
    [0, null],
    [1, '🌱'],
    [2, '🌱'],
    [3, '🌿'],
    [6, '🌿'],
    [7, '🪴'],
    [13, '🪴'],
    [14, '🌳'],
    [100, '🌳'],
  ])('days=%i면 %s를 반환한다', (days, expected) => {
    expect(resolveStreakIcon(days)).toBe(expected);
  });

  it('음수 days는 배지를 숨긴다', () => {
    expect(resolveStreakIcon(-1)).toBeNull();
  });
});
