import { API_BASE_URL } from '@/lib/api-client';

// OAuth 리다이렉트 라우트라 Swagger 문서/hey-api 생성 대상에서 제외돼 있음 — URL만 수동 유지.
export const authApi = {
  googleLoginUrl: `${API_BASE_URL}/auth/google`,
  kakaoLoginUrl: `${API_BASE_URL}/auth/kakao`,
};
