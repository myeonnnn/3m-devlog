import { authApi } from '../api/auth-api';
import { buttonClass } from '@/components/button';

export function LoginButtons() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <a href={authApi.googleLoginUrl} className={buttonClass('line')}>
        [ Google 로그인 ]
      </a>
      <a href={authApi.kakaoLoginUrl} className={buttonClass('line')}>
        [ 카카오 로그인 ]
      </a>
    </div>
  );
}
