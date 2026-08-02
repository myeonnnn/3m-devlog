# view — 3m-devlog 프론트엔드

Next.js 기반 프론트엔드. 서비스 개요·배포는 [루트 README](../README.md), API 명세는 [server README](../server/README.md) 참고.

## 스택

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4
- TanStack React Query
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

현재 `features/auth`, `features/devlog` 두 모듈이 있다.

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

## 테스트

```bash
npm test            # 1회 실행
npm run test:watch   # watch 모드
npm run test:ui      # UI 모드
```

- 테스트 파일은 대상 파일과 같은 폴더의 `__tests__/` 하위에 둔다 (예: `hooks/use-devlogs.ts` → `hooks/__tests__/use-devlogs.test.ts`).
- 우선순위: `rules/`·`utils/`의 순수 함수 → 훅(`use-*.ts`)의 분기/상태 로직 → 컴포넌트(스냅샷 대신 사용자 행동 기준, 선택적으로). E2E는 아직 미도입.

## 아키텍처 노트

프레젠테이션과 비즈니스 로직(데이터 패칭/뮤테이션)을 계층으로 분리했다.

- `src/lib/`: 도메인 타입, 순수 fetch API 클라이언트(`api-client.ts`, `devlog-api.ts`, `auth-api.ts`), 게스트 로컬 저장소(`guest-storage.ts`)
- `src/hooks/use-devlogs.ts`, `use-auth.ts`, `use-guest-devlogs.ts`: React Query(또는 로컬 상태) 훅 — 비즈니스 로직 계층
- `src/components/devlog/`, `src/components/auth/`: 프레젠테이션 전용 컴포넌트 (props/콜백으로만 동작, 데이터 패칭 없음)
- `src/app/page.tsx`: 인증 여부에 따라 API 훅 / 게스트 훅 중 실제 데이터 소스만 분기 (컴포넌트는 공용), 비로그인 시 `GuestBanner` 노출
- `src/app/mypage/page.tsx`: 마이페이지 — 프로필/통계 조회, 로그아웃/회원탈퇴

## Lint

```bash
npm run lint
```
