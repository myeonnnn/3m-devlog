# 3m-devlog v1

개발자가 오늘 배운 점과 해결한 버그를 3분 만에 기록하고, 검색/태그로 다시 찾아보는 서비스. (요구사항: [`requirements/3m-log 요구사항_20260723.md`](./requirements/3m-log%20요구사항_20260723.md), 도메인 모델: [`docs/domain-model.md`](./docs/domain-model.md))


## AI를 활용한 개발 방식

이 프로젝트의 목적은 서비스 자체보다 AI와 함께 문제를 정의하고 개발하는 과정에 있습니다. 서버/인프라는 그 과정에서 자연스럽게 익힌 부분입니다. 새 요구사항이 들어오면 아래 순서로 처리합니다.

### 1. 요구사항 문서화

요구사항은 한 번에 확정하지 않고 [`requirements/`](./requirements)에 버전별 문서로 남깁니다. 기존 문서를 베이스로 추가/변경되는 내용만 정리합니다.

### 2. 설계 영향 확인

구조(애그리거트, 컨텍스트 등)에 영향이 있으면 [도메인 모델](./docs/domain-model.md)을 갱신합니다. 단순 정책 변경이면 건너뜁니다.

### 3. 정책 반영

비즈니스 규칙이 새로 생기거나 바뀌면 [정책 문서](./docs/policies.md)를 현재 상태로 갱신합니다. 변경 이력은 남기지 않습니다 — 요구사항 문서와 tasks.md가 그 역할을 합니다.

### 4. 작업 분해

[`tasks.md`](./requirements/tasks.md)로 요구사항별 체크리스트를 관리하며 진행 상황을 추적합니다.

### 5. 구현

코드를 작성하고 테스트로 검증하며, 체크리스트 항목을 하나씩 완료 처리합니다.

### 6. 회고

세션마다 얻은 교훈을 [`CLAUDE.md`](./CLAUDE.md)에 남겨, 다음 세션에서 같은 실수를 반복하지 않게 합니다.

### AI에게 맡긴 것 vs 직접 판단한 것

우선순위나 정책 같은 결정은 직접 내리고, 익숙하지 않은 스택의 구현 디테일은 AI에게 맡깁니다.

## 기술 스택

| 영역 | 선택 |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, TanStack React Query |
| Backend | NestJS 11, TypeScript |
| DB / ORM | PostgreSQL 16, Prisma 7 (driver adapter: `@prisma/adapter-pg`) |
| 로컬 인프라 | Docker Compose (Postgres) |

## 폴더 구조

```
v1/
  server/   # NestJS API 서버
  view/     # Next.js 프론트엔드
```

## 현재 구현 범위

요구사항 대비 진행 상황 체크리스트: [`requirements/tasks.md`](./requirements/tasks.md)

- **DevLog** 도메인 구현 (생성/조회/수정/삭제, 태그 필터, 키워드 검색, 인기 태그 집계)
- **소셜 로그인** (Google 구현·테스트 완료, Kakao는 코드까지만 구현 — 실제 앱 자격증명 필요). JWT를 httpOnly 쿠키로 발급해 로그인 상태 유지.

## 로컬 실행

### 1. server

```bash
cd v1/server
npm install
docker compose up -d          # 로컬 Postgres 기동
npx prisma migrate dev        # 최초 1회 (스키마 적용)
npm run start:dev             # http://localhost:3001 (PORT로 변경 가능)
```

`DATABASE_URL`은 `.env`에 있으며 위 `docker-compose.yml`의 계정과 맞춰져 있다.

**소셜 로그인 자격증명** (`.env`에 추가):
- Google: [Cloud Console](https://console.cloud.google.com/apis/credentials)에서 OAuth 클라이언트 생성 (Web application), 승인된 리디렉션 URI `http://localhost:3001/auth/google/callback` 등록 → `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`에 입력. OAuth consent screen이 "Testing" 상태면 로그인할 구글 계정을 Test users에 추가해야 함.
- Kakao: [Kakao Developers](https://developers.kakao.com)에서 앱 생성 → 카카오 로그인 활성화, Redirect URI `http://localhost:3001/auth/kakao/callback` 등록 → REST API 키를 `KAKAO_CLIENT_ID`에 입력. "개발 중" 상태면 로그인할 계정을 앱 팀원으로 추가해야 함.
- 자격증명이 비어있으면(placeholder) 서버는 뜨지만 로그인 시도 시 Google/Kakao 쪽에서 에러가 남.

### 2. view

```bash
cd v1/view
npm install
npm run dev                   # http://localhost:3000
```

`NEXT_PUBLIC_API_BASE_URL`은 `.env.local`에서 설정 (기본값 `http://localhost:3001`).

## API (server)

### 인증

| Method | Path | 설명 |
|---|---|---|
| GET | `/auth/google` | 구글 로그인 시작 (리다이렉트) |
| GET | `/auth/google/callback` | 구글 콜백, JWT를 httpOnly 쿠키로 발급 후 `FRONTEND_URL`로 리다이렉트 |
| GET | `/auth/kakao` / `/auth/kakao/callback` | 카카오 로그인 (동일 흐름) |
| GET | `/auth/me` | 현재 로그인 사용자 정보 (`id`/`displayName`/`email`/`provider`, 인증 필요) |
| POST | `/auth/logout` | 로그아웃 (쿠키 삭제) |
| DELETE | `/auth/me` | 회원탈퇴 — 계정 + 해당 계정의 모든 DevLog 영구 삭제 (복구 불가) |

### DevLog

베이스 경로: `/devlogs`. 모든 요청은 로그인(쿠키) 필요, 없으면 401.

| Method | Path | 설명 |
|---|---|---|
| POST | `/devlogs` | 생성 |
| GET | `/devlogs?search=&tag=` | 목록 조회 (키워드 검색 / 태그 필터) |
| GET | `/devlogs/tags/popular` | 인기 태그 집계 (본인 로그 기준) |
| GET | `/devlogs/stats` | 마이페이지용 통계 (`totalCount`, `topTags`) |
| GET | `/devlogs/:id` | 단건 조회 |
| PATCH | `/devlogs/:id` | 수정 |
| DELETE | `/devlogs/:id` | 삭제 |

- 소유자가 아니면 403, 존재하지 않으면 404.
- 태그는 대소문자 무관하게 정규화되어 중복 없이 저장되고, `displayName`은 최초 입력값을 유지한다.
- Postman으로 테스트하려면 `server/postman_collection.json`을 임포트 (단, 로그인 라우트는 브라우저 리다이렉트 흐름이라 Postman만으로는 전체 플로우 테스트가 어려움 — 브라우저에서 로그인 후 쿠키를 복사해 사용).

## 테스트 (server)

```bash
cd v1/server
npm test          # 유닛 테스트 (DevLogService, Prisma는 mock)
npm run test:e2e  # e2e 테스트 (실제 Postgres에 접속, docker compose up 필요)

# 또는 Makefile로:
make test         # 유닛 테스트
make test-e2e     # Postgres 기동 후 e2e 테스트
make test-all     # 유닛 + e2e
```

- 유닛 테스트: 태그 정규화/중복 제거, 소유권 검증(403/404), 인기 태그 집계 로직 (`src/devlog/devlog.service.spec.ts`)
- e2e 테스트: 실제 DB에 대해 생성→필터/검색→수정→삭제 전체 흐름 검증 (`test/devlog.e2e-spec.ts`), 테스트에서 만든 데이터는 종료 시 자동 정리됨
- Prisma 7 클라이언트가 WASM 쿼리 컴파일러를 동적 import하기 때문에, e2e는 `NODE_OPTIONS=--experimental-vm-modules`로 실행한다 (`test:e2e` 스크립트에 포함됨).

## 아키텍처 노트

### server

- `prisma/schema.prisma`: `DevLog` – `Tag` – `DevLogTag`(조인 테이블) 다대다 구조. Tag를 별도 애그리거트로 두지 않고 정규화 저장만 하는 이유는 [도메인 모델 문서](./docs/domain-model.md#32-devlog-aggregate-devlog-context--핵심-애그리거트) 참고.
- `src/prisma/`: `PrismaService`/`PrismaModule` (전역 모듈)
- `src/devlog/`: 컨트롤러/서비스/DTO
- `src/users/`: `User` 조회/find-or-create, `deleteAccountAndData`(계정+DevLog 영구 삭제, 트랜잭션) (Identity Context)
- `src/auth/`: Passport 전략(Google/Kakao/JWT), JWT 발급, 로그인/콜백/me/logout/회원탈퇴 컨트롤러
- `src/common/decorators/owner-id.decorator.ts`: `JwtAuthGuard` 통과 후 `request.user.id`를 꺼내는 파라미터 데코레이터

### view

프레젠테이션과 비즈니스 로직(데이터 패칭/뮤테이션)을 계층으로 분리했다.

- `src/lib/`: 도메인 타입, 순수 fetch API 클라이언트(`api-client.ts`, `devlog-api.ts`, `auth-api.ts`), 게스트 로컬 저장소(`guest-storage.ts`)
- `src/hooks/use-devlogs.ts`, `use-auth.ts`, `use-guest-devlogs.ts`: React Query(또는 로컬 상태) 훅 — 비즈니스 로직 계층
- `src/components/devlog/`, `src/components/auth/`: 프레젠테이션 전용 컴포넌트 (props/콜백으로만 동작, 데이터 패칭 없음)
- `src/app/page.tsx`: 인증 여부에 따라 API 훅 / 게스트 훅 중 실제 데이터 소스만 분기 (컴포넌트는 공용), 비로그인 시 `GuestBanner` 노출
- `src/app/mypage/page.tsx`: 마이페이지 — 프로필/통계 조회, 로그아웃/회원탈퇴

## 알아두어야 할 점 / 다음 단계

- Prisma 7부터 클라이언트가 기본 ESM으로 생성되고 드라이버 어댑터가 필수라, `schema.prisma`의 `generator client`에 `moduleFormat = "cjs"`를 지정하고 `@prisma/adapter-pg`를 명시적으로 연결했다.
- Passport 전략(Google/Kakao)은 생성자에서 `clientID`가 비어있으면 서버 부팅 자체가 실패하므로, 자격증명 없을 때도 placeholder 값을 채워둔다.
- `JwtStrategy`는 토큰 서명뿐 아니라 매 요청마다 계정이 실제로 존재하는지 DB로 확인한다 (회원탈퇴 후 만료 전 토큰이 재사용되는 것을 방지).
- 인기 태그 집계 기준(본인 로그 기준으로 재확정, 2026-07-28 요구사항에서 뒤집힘), 검색 대상 범위(전체 필드로 확정) 등은 [도메인 모델 문서 7장](./docs/domain-model.md#7-확인된-사항) 참고.

## 프로덕션 배포 체크리스트 (server)

- `NODE_ENV=production`으로 기동하면 `JWT_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`KAKAO_CLIENT_ID`가 비어있거나 `.env`의 개발용 placeholder 값 그대로면 부팅 자체를 막는다 (`src/main.ts`의 `assertProductionEnv`). 실제 값으로 교체 필요.
- 인증 쿠키는 `NODE_ENV=production`일 때 자동으로 `secure: true` + `sameSite: 'none'`으로 전환된다 (`src/auth/auth.controller.ts`). HTTPS 배포 전제.
- Google/Kakao 콘솔에 로컬(`localhost`) 리디렉션 URI에 더해 프로덕션 URI도 추가 등록해야 한다 (같은 앱에 여러 개 등록 가능).
- Google OAuth consent screen이 "Testing" 상태면 등록된 테스트 계정만 로그인 가능 — 일반 사용자에게 열려면 게시/검증 절차 필요.
- Kakao 앱이 "개발 중" 상태면 팀원 계정만 로그인 가능 — 일반 사용자에게 열려면 카카오 심사 필요.
- `npm run start:prod`는 `NODE_ENV=production node dist/src/main`을 실행한다 (기본 Nest 템플릿의 `node dist/main`은 이 프로젝트의 빌드 출력 경로와 안 맞아 즉시 깨짐 — `nest build`가 `dist/generated`, `dist/src` 구조로 출력하기 때문).
