import { authApi } from '@/lib/auth-api';

export function LoginScreen() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-sm text-dim">
          $ 3m-devlog --boot
          <br />
          initializing session...
          <br />
          awaiting authentication
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-signal align-middle" />
        </p>

        <h1 className="mt-6 text-xl font-bold text-text">3분 개발 로그</h1>
        <p className="mt-1 text-sm text-dim">
          오늘 배운 점과 해결한 버그를 3분 만에 기록해요.
        </p>

        <div className="mt-8 flex flex-col gap-3">
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
      </div>
    </div>
  );
}
