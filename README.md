# 3m-devlog v1

개발자가 오늘 배운 점과 해결한 버그를 3분 만에 기록하고, 검색/태그로 다시 찾아보는 서비스. (요구사항: [`3m-log 요구사항_20260723.md`](./3m-log%20요구사항_20260723.md), 도메인 모델: [`docs/domain-model.md`](./docs/domain-model.md))

v1은 학습 목적으로 view(Next.js)와 server(NestJS)를 완전히 독립된 프로젝트로 구성한 버전이다.

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

- **DevLog** 도메인만 구현 (생성/조회/수정/삭제, 태그 필터, 키워드 검색, 인기 태그 집계)
- 소셜 로그인(Google/Kakao)은 아직 미구현. 인증 전이라 `ownerId`는 요청 헤더 `x-user-id`로 임시 전달한다.
  - 프론트는 브라우저 `localStorage`에 임의 UUID를 발급해 자동으로 이 헤더를 붙인다 (`view/src/lib/user-id.ts`).
  - 실제 로그인이 붙으면 서버의 `OwnerId` 데코레이터(`server/src/common/decorators/owner-id.decorator.ts`)와 프론트의 `user-id.ts`를 인증된 사용자 컨텍스트로 교체하면 된다.

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

### 2. view

```bash
cd v1/view
npm install
npm run dev                   # http://localhost:3000
```

`NEXT_PUBLIC_API_BASE_URL`은 `.env.local`에서 설정 (기본값 `http://localhost:3001`).

## API (server)

베이스 경로: `/devlogs`. 모든 요청에 `x-user-id` 헤더 필요 (없으면 400).

| Method | Path | 설명 |
|---|---|---|
| POST | `/devlogs` | 생성 |
| GET | `/devlogs?search=&tag=` | 목록 조회 (키워드 검색 / 태그 필터) |
| GET | `/devlogs/tags/popular` | 인기 태그 집계 (owner 스코프) |
| GET | `/devlogs/:id` | 단건 조회 |
| PATCH | `/devlogs/:id` | 수정 |
| DELETE | `/devlogs/:id` | 삭제 |

- 소유자가 아니면 403, 존재하지 않으면 404.
- 태그는 대소문자 무관하게 정규화되어 중복 없이 저장되고, `displayName`은 최초 입력값을 유지한다.
- Postman으로 테스트하려면 `server/postman_collection.json`을 임포트.

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
- `src/common/decorators/owner-id.decorator.ts`: 임시 인증 스텁

### view

프레젠테이션과 비즈니스 로직(데이터 패칭/뮤테이션)을 계층으로 분리했다.

- `src/lib/`: 도메인 타입, 순수 fetch API 클라이언트, 임시 user-id 발급
- `src/hooks/use-devlogs.ts`: React Query 훅 (조회/생성/수정/삭제) — 비즈니스 로직 계층
- `src/components/devlog/`: 프레젠테이션 전용 컴포넌트 (props/콜백으로만 동작, 데이터 패칭 없음)
- `src/app/page.tsx`: 위 훅과 컴포넌트를 조립하는 얇은 조합 계층

## 알아두어야 할 점 / 다음 단계

- Prisma 7부터 클라이언트가 기본 ESM으로 생성되고 드라이버 어댑터가 필수라, `schema.prisma`의 `generator client`에 `moduleFormat = "cjs"`를 지정하고 `@prisma/adapter-pg`를 명시적으로 연결했다.
- 소셜 로그인(Google/Kakao) 구현 후 User 테이블/인증 미들웨어 추가 필요.
- 인기 태그 집계 기준(본인 글 vs 전체 사용자), 검색 대상 범위 등은 [도메인 모델 문서 7장](./docs/domain-model.md#7-구현-전-확인-필요-사항)에 열린 질문으로 남아있음.
