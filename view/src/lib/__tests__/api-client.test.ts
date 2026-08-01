import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from '../api-client';

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status,
      json: response.json ?? (async () => ({})),
    }),
  );
}

describe('request', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('응답이 ok가 아니면 status와 message를 담은 ApiError로 reject한다', async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      json: async () => ({ message: '해당 기간에 기록이 없어요.' }),
    });

    await expect(request('/insights/generate')).rejects.toMatchObject({
      status: 422,
      message: '해당 기간에 기록이 없어요.',
    });
    await expect(request('/insights/generate')).rejects.toBeInstanceOf(ApiError);
  });

  it('message가 배열이면 하나의 문자열로 합쳐서 ApiError를 던진다', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: ['필수 항목이에요.', '형식이 올바르지 않아요.'] }),
    });

    await expect(request('/devlogs')).rejects.toMatchObject({
      status: 400,
      message: '필수 항목이에요., 형식이 올바르지 않아요.',
    });
  });

  it('204 응답은 JSON 파싱 없이 undefined로 resolve한다', async () => {
    const json = vi.fn();
    mockFetchOnce({ ok: true, status: 204, json });

    const result = await request('/devlogs/1');

    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });
});
