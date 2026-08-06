import { describe, expect, it } from 'vitest';
import { joinArrayMessage } from '../client-config';

describe('joinArrayMessage', () => {
  it('message가 배열이면 하나의 문자열로 합친다', () => {
    const result = joinArrayMessage({
      statusCode: 400,
      message: ['필수 항목이에요.', '형식이 올바르지 않아요.'],
    });

    expect(result).toMatchObject({
      statusCode: 400,
      message: '필수 항목이에요., 형식이 올바르지 않아요.',
    });
  });

  it('message가 문자열이면 그대로 둔다', () => {
    const result = joinArrayMessage({ statusCode: 404, message: 'DevLog not found' });

    expect(result).toMatchObject({ statusCode: 404, message: 'DevLog not found' });
  });

  it('error가 객체가 아니면 그대로 둔다', () => {
    expect(joinArrayMessage('raw text error')).toBe('raw text error');
    expect(joinArrayMessage(undefined)).toBeUndefined();
  });
});
