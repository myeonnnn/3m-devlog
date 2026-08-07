import { describe, expect, it } from 'vitest';
import { devLogFormSchema, maxLogDate, normalizeTag, toLogFilename } from '../devlog-form';

function parse(learnedNote: string, logDate: string) {
  return devLogFormSchema.safeParse({
    learnedNote,
    logDate,
    troubleshootingNote: '',
    tomorrowTask: '',
    tags: [],
  });
}

describe('devLogFormSchema', () => {
  it('learnedNote가 비어있으면 에러를 반환한다', () => {
    const result = parse('', maxLogDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('오늘 배운 점은 필수 입력이에요.');
    }
  });

  it('learnedNote가 공백만 있어도 필수 입력 에러를 반환한다', () => {
    const result = parse('   ', maxLogDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('오늘 배운 점은 필수 입력이에요.');
    }
  });

  it('허용 범위보다 과거인 날짜는 거부한다', () => {
    const result = parse('배운 것', '2000-01-01');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('날짜는 오늘부터 과거 최대 1개월 이내여야 해요.');
    }
  });

  it('허용 범위보다 미래인 날짜는 거부한다', () => {
    const result = parse('배운 것', '9999-12-31');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('날짜는 오늘부터 과거 최대 1개월 이내여야 해요.');
    }
  });

  it('내용이 있고 날짜가 허용 범위 안이면 통과한다', () => {
    const result = parse('배운 것', maxLogDate);
    expect(result.success).toBe(true);
  });
});

describe('normalizeTag', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeTag('  react  ')).toBe('react');
  });

  it('맨 앞의 # 하나를 제거한다', () => {
    expect(normalizeTag('#react')).toBe('react');
  });

  it('맨 앞의 #만 제거하고, 중간에 있는 #은 그대로 둔다', () => {
    expect(normalizeTag('#re#act')).toBe('re#act');
  });
});

describe('toLogFilename', () => {
  it('ISO 날짜/시간 문자열을 YYYY-MM-DD로 변환한다', () => {
    expect(toLogFilename('2026-07-30T12:34:56.000Z')).toBe('2026-07-30');
  });
});
