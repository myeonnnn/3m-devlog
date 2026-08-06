# view — 3m-devlog 프론트엔드

Next.js 기반 프론트엔드. 서비스 개요·배포는 [루트 README](../README.md), API 명세는 [server README](../server/README.md) 참고.

## 스택

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4
- TanStack React Query
- hey-api (`@hey-api/openapi-ts`) — server의 OpenAPI 스펙에서 타입/SDK/React Query 훅 생성 (현재 devlog feature만 적용)
- Vitest + React Testing Library (테스트)

## 폴더 구조

기능(도메인) 기준으로 분리한 구조. 상세 컨벤션·판단 기준은 [`CLAUDE.md`](./CLAUDE.md) 참고.

```
src/
├── app/                # Next.js 라우트. 여러 feature를 조립만 함
├── components/         # 앱 전역 공통 UI (특정 feature에 속하지 않는 것만)
├── lib/                # 외부 라이브러리 초기화/설정 (api-client, providers 등)
├── styles/             # 전역 스타일
├── utils/              # 도메인 무관 순수 유틸 (날짜 포맷 등)
└── features/<name>/    # 기능(도메인) 단위 모듈
    ├── api/            # API 요청, 로컬 스토리지 등 데이터 접근
    ├── components/      # 이 feature 전용 UI
    ├── hooks/           # React Query/상태 훅
    ├── rules/           # 도메인 고유 비즈니스 규칙 (매직값·검증 등)
    ├── types/           # 이 feature의 타입
    └── index.ts         # 공개 API (외부가 실제로 쓰는 것만 export)
```

현재 `features/auth`, `features/devlog`, `features/insight` 세 모듈이 있다.

UI 작업 시 컬러/타이포/컴포넌트 토큰은 [`../docs/design-system.md`](../docs/design-system.md)를 따른다.

## 실행

### 요구사항

Node LTS (v24+). v18에서는 Next 16 typegen, Tailwind oxide 네이티브 바이너리가 깨진다.

### 환경 변수 (`.env.local`)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | server API 주소 | `http://localhost:3001` |

### 개발 서버

```bash
npm install
npm run dev        # http://localhost:3000
```

### 빌드 / 프로덕션 실행

```bash
npm run build
npm run start
```

### API 타입/SDK 생성 (devlog feature)

server에서 먼저 `npm run export:openapi`로 `../server/openapi.json`을 만든 뒤:

```bash
npm run generate:api   # src/lib/api/generated/ 에 타입 + SDK + React Query 훅 생성, git에 커밋됨
```

server의 devlog DTO가 바뀌면 다시 실행해서 재생성해야 한다. 생성 결과는 `openapi-ts.config.ts` 설정을 따른다.

## 테스트

```bash
npm test            # 1회 실행
npm run test:watch   # watch 모드
npm run test:ui      # UI 모드
```

- 테스트 파일은 대상 파일과 같은 폴더의 `__tests__/` 하위에 둔다 (예: `hooks/use-devlogs.ts` → `hooks/__tests__/use-devlogs.test.ts`).
- 우선순위: `rules/`·`utils/`의 순수 함수 → 훅(`use-*.ts`)의 분기/상태 로직 → 컴포넌트(스냅샷 대신 사용자 행동 기준, 선택적으로). E2E는 아직 미도입.

## 아키텍처 노트

각 `features/<name>/` 안에서 프레젠테이션과 비즈니스 로직(데이터 패칭/뮤테이션)을 계층으로 분리한다 (폴더 구조·판단 기준은 위 "폴더 구조", [`CLAUDE.md`](./CLAUDE.md) 참고).

- `features/auth/`: `hooks/use-auth.ts`(로그인 상태/로그아웃/탈퇴), `components/guest-banner.tsx`
- `features/devlog/`: `hooks/use-devlogs.ts`(hey-api가 생성한 queryOptions/mutationOptions 기반, 아래 참고) + `hooks/use-devlog-controller.ts`(인증/게스트 여부에 따라 authed·guest 컨트롤러를 하나의 인터페이스로 합침), `api/guest-storage.ts`(비로그인 사용자용 localStorage 저장소), `components/`(검색바·태그칩·목록·작성 모달)
- `features/insight/`: `hooks/use-insights.ts`, `hooks/use-insight-controller.ts`, AI 인사이트 모달/엔트리 버튼 컴포넌트
- `src/lib/api-client.ts`: 순정 fetch 기반 요청 래퍼(쿠키 인증, `ApiError`) — auth/insight feature가 사용
- `src/lib/api/generated/`: hey-api가 생성한 타입/SDK/React Query 훅 (devlog feature만, 위 "API 타입/SDK 생성" 참고). `src/lib/api/client-config.ts`에서 baseUrl/credentials 및 에러 메시지 정규화(class-validator의 배열 message를 문자열로 join) 설정
- `src/lib/providers.tsx`: `QueryClientProvider` 등 앱 전역 프로바이더, `client-config.ts`를 side-effect import해서 부팅 시 hey-api 클라이언트 설정 적용
- `src/app/page.tsx`: 메인 화면 — `features/devlog`, `features/auth`, `features/insight`의 공개 API(훅+컴포넌트)를 조립. 인증 여부에 따라 devlog의 authed/guest 컨트롤러 중 실제 데이터 소스만 분기, 비로그인 시 `GuestBanner` 노출
- `src/app/mypage/page.tsx`: 마이페이지 — 프로필/통계 조회, 로그아웃/회원탈퇴
- `src/components/`: feature에 속하지 않는 전역 UI (`Logo`, `Button`, `Input` 등)

## Lint

```bash
npm run lint
```
