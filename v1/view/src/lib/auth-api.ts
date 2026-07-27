import { CurrentUser } from './types';
import { API_BASE_URL, request } from './api-client';

export const authApi = {
  googleLoginUrl: `${API_BASE_URL}/auth/google`,
  kakaoLoginUrl: `${API_BASE_URL}/auth/kakao`,

  async me(): Promise<CurrentUser | null> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include',
    });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error('로그인 상태를 확인하지 못했어요.');
    return res.json() as Promise<CurrentUser>;
  },

  logout(): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST' });
  },
};
