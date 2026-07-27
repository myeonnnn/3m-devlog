import { authApi } from '@/lib/auth-api';

export function LoginScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-100">
          3분 개발 로그
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          오늘 배운 점과 해결한 버그를 3분 만에 기록해요.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <a
          href={authApi.googleLoginUrl}
          className="flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Google로 로그인
        </a>
        <a
          href={authApi.kakaoLoginUrl}
          className="flex items-center justify-center rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-neutral-900 hover:brightness-95"
        >
          카카오로 로그인
        </a>
      </div>
    </div>
  );
}
