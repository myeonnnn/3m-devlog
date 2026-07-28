import { LoginButtons } from './login-buttons';

export function GuestBanner() {
  return (
    <div className="flex flex-col gap-3 border border-line bg-panel p-4">
      <p className="text-sm text-dim">
        <span className="text-signal">guest&gt;</span> 로그인 없이 둘러보는
        중이에요. 기록은 <span className="text-text">이 브라우저에만</span>{' '}
        저장되고, 로그인해도 계정으로 옮겨지지 않아요. 기기를 바꾸거나 브라우저
        데이터를 지우면 사라져요.
      </p>
      <LoginButtons />
    </div>
  );
}
