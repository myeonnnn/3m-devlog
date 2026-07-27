const STORAGE_KEY = 'devlog:userId';

/**
 * 소셜 로그인이 아직 없어서 브라우저별로 임시 사용자 id를 발급/저장한다.
 * 인증이 붙으면 이 모듈을 실제 로그인 사용자 id로 교체한다.
 */
export function getOrCreateUserId(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const generated = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}
