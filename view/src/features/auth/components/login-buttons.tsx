import { authApi } from '../api/auth-api';

export function LoginButtons() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <a
        href={authApi.googleLoginUrl}
        className="flex h-11 items-center justify-center border border-line px-4 text-sm text-text hover:border-signal hover:text-signal"
      >
        [ Google 로그인 ]
      </a>
      <a
        href={authApi.kakaoLoginUrl}
        className="flex h-11 items-center justify-center border border-line px-4 text-sm text-text hover:border-signal hover:text-signal"
      >
        [ 카카오 로그인 ]
      </a>
    </div>
  );
}
