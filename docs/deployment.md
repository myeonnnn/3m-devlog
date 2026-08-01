# 프로덕션 배포 체크리스트 (server)

- `NODE_ENV=production`으로 기동하면 `JWT_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`KAKAO_CLIENT_ID`가 비어있거나 `.env`의 개발용 placeholder 값 그대로면 부팅 자체를 막는다 (`src/main.ts`의 `assertProductionEnv`). 실제 값으로 교체 필요.
- 인증 쿠키는 `NODE_ENV=production`일 때 자동으로 `secure: true` + `sameSite: 'none'`으로 전환된다 (`src/auth/auth.controller.ts`). HTTPS 배포 전제.
- Google/Kakao 콘솔에 로컬(`localhost`) 리디렉션 URI에 더해 프로덕션 URI도 추가 등록해야 한다 (같은 앱에 여러 개 등록 가능).
- Google OAuth consent screen이 "Testing" 상태면 등록된 테스트 계정만 로그인 가능 — 일반 사용자에게 열려면 게시/검증 절차 필요.
- Kakao 앱이 "개발 중" 상태면 팀원 계정만 로그인 가능 — 일반 사용자에게 열려면 카카오 심사 필요.
- `npm run start:prod`는 `NODE_ENV=production node dist/src/main`을 실행한다 (기본 Nest 템플릿의 `node dist/main`은 이 프로젝트의 빌드 출력 경로와 안 맞아 즉시 깨짐 — `nest build`가 `dist/generated`, `dist/src` 구조로 출력하기 때문).
- AI 인사이트 기능(`src/insight/`)은 현재 로컬 `claude` CLI 서브프로세스로 동작하는 개발 전용 구현(`ClaudeCliInsightGenerator`)만 있다. 배포 환경에는 이 CLI가 없으므로, `NODE_ENV=production`이면 앱 부팅을 막지는 않되 인사이트 생성 요청 시 502로 명확히 안내만 한다. 실제로 프로덕션에서 이 기능을 쓰려면 실제 Anthropic API 키 기반의 새 `InsightGenerator` 구현체를 만들어 `src/insight/insight-generator.port.ts`의 포트를 교체해야 한다.
