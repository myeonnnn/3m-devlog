import { client } from './generated/client.gen';
import { API_BASE_URL } from '../api-client';

client.setConfig({
  baseUrl: API_BASE_URL,
  credentials: 'include',
});

// NestJS의 유효성 검사 에러는 message가 문자열 배열일 수 있어, 기존 request() 래퍼와 동일하게 합쳐준다.
export function joinArrayMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    Array.isArray((error as { message?: unknown }).message)
  ) {
    return {
      ...error,
      message: (error as { message: string[] }).message.join(', '),
    };
  }
  return error;
}

client.interceptors.error.use(joinArrayMessage);
