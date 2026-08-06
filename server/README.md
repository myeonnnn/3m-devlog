# server — 3m-devlog API 서버

NestJS 기반 API 서버. 서비스 개요·배포는 [루트 README](../README.md) 참고.

## 스택

- NestJS 11
- TypeScript
- PostgreSQL 16 + Prisma 7 (driver adapter: `@prisma/adapter-pg`)
- Passport (Google/Kakao OAuth, JWT) — 로그인 세션은 httpOnly 쿠키로 유지
- Jest (테스트)

## 폴더 구조

```
src/
├── auth/       # Passport 전략(Google/Kakao/JWT), 로그인/콜백/me/logout/회원탈퇴 컨트롤러
├── users/      # User 조회/find-or-create, 계정 삭제 (Identity Context)
├── devlog/     # DevLog 컨트롤러/서비스/DTO
├── insight/    # AI 인사이트 생성/조회 (현재 로컬 Claude CLI 기반, 아래 "AI 인사이트" 참고)
├── prisma/     # PrismaService/PrismaModule (전역 모듈)
└── common/     # 공용 데코레이터 (OwnerId 등)
prisma/
├── schema.prisma
└── migrations/
```

`DevLog` – `Tag` – `DevLogTag`(조인 테이블) 다대다 구조. 설계 배경은 [도메인 모델 문서](../docs/domain-model.md) 참고.

## 실행

### 요구사항

Node LTS (v24+). Prisma 7 엔진이 v18에서 깨진다.

### 1. 의존성 설치 & DB 기동

```bash
npm install
docker compose up -d   # 로컬 Postgres (5432, devlog/devlog)
```

### 2. 환경 변수 (`.env`)

| 변수 | 설명 |
|---|---|
| `DATABASE_URL` | Postgres 연결 문자열 (`docker-compose.yml` 계정과 일치해야 함) |
| `FRONTEND_URL` | OAuth 로그인 성공 후 리다이렉트 대상, CORS 허용 origin |
| `JWT_SECRET` | JWT 서명 키 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth ([Cloud Console](https://console.cloud.google.com/apis/credentials)에서 발급) |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` / `KAKAO_CALLBACK_URL` | Kakao OAuth ([Kakao Developers](https://developers.kakao.com)에서 발급) |

- Google: [Cloud Console](https://console.cloud.google.com/apis/credentials)에서 OAuth 클라이언트 생성 (Web application), 승인된 리디렉션 URI `http://localhost:3001/auth/google/callback` 등록 → `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`에 입력. OAuth consent screen이 "Testing" 상태면 로그인할 구글 계정을 Test users에 추가해야 함.
- Kakao: [Kakao Developers](https://developers.kakao.com)에서 앱 생성 → 카카오 로그인 활성화, Redirect URI `http://localhost:3001/auth/kakao/callback` 등록 → REST API 키를 `KAKAO_CLIENT_ID`에 입력. "개발 중" 상태면 로그인할 계정을 앱 팀원으로 추가해야 함.

값이 비어있으면(placeholder) 서버는 뜨지만 해당 소셜 로그인 시도 시 에러가 난다. 단, `clientID`가 완전히 빈 문자열이면 Passport 전략 생성자에서 부팅 자체가 실패하므로 placeholder 문자열은 유지해야 한다.

`NODE_ENV=production`일 때는 위 값들이 비어있거나 dev용 placeholder 그대로면 부팅 시 에러를 낸다 (`main.ts`의 `assertProductionEnv`).

### 3. 마이그레이션 (최초 1회)

```bash
npx prisma migrate dev
```

### 4. 개발 서버

```bash
npm run start:dev   # http://localhost:3001 (PORT로 변경 가능)
```

기본 포트는 3000이지만 Next.js 개발 서버와 겹치므로 `PORT=3001`로 띄운다.

### 5. API 문서 (Swagger)

개발 서버가 떠 있으면 `http://localhost:3001/docs`에서 Swagger UI로 전체 API 스펙을 확인·테스트할 수 있다 (`NODE_ENV=production`에서는 비활성화).

```bash
npm run export:openapi   # openapi.json으로 정적 export (Postgres 불필요, view의 hey-api 코드 생성 입력으로 사용)
```

## 테스트

```bash
make test        # 유닛 테스트 (DevLogService, Prisma는 mock)
make test-e2e     # e2e (Postgres 기동 후 실행)
make test-all     # 유닛 + e2e
```

- 유닛 테스트: 태그 정규화/중복 제거, 소유권 검증(403/404), 인기 태그 집계 로직 (`src/devlog/devlog.service.spec.ts`)
- e2e 테스트: 실제 DB에 대해 생성→필터/검색→수정→삭제 전체 흐름 검증 (`test/devlog.e2e-spec.ts`), 테스트에서 만든 데이터는 종료 시 자동 정리됨
- Prisma 7 클라이언트가 WASM 쿼리 컴파일러를 동적 import하므로 e2e는 `NODE_OPTIONS=--experimental-vm-modules`로 실행한다 (`test:e2e` 스크립트에 포함됨).

## API

아래는 요약이고, 최신 스펙은 개발 서버 실행 중 `/docs`(Swagger UI, 위 참고)에서 확인하는 게 정확하다.

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
- Postman으로 테스트하려면 `postman_collection.json`을 임포트 (단, 로그인 라우트는 브라우저 리다이렉트 흐름이라 Postman만으로는 전체 플로우 테스트가 어려움 — 브라우저에서 로그인 후 쿠키를 복사해 사용).

### AI 인사이트

베이스 경로: `/insights`. 모든 요청은 로그인(쿠키) 필요.

| Method | Path | 설명 |
|---|---|---|
| POST | `/insights/generate` | 특정 기간(`periodType`/`periodKey`) DevLog 묶음으로 인사이트(요약/패턴) 생성 |
| GET | `/insights?periodType=&periodKey=` | 특정 기간 인사이트 조회 |
| GET | `/insights/latest` | 가장 최근 생성된 인사이트 조회 |

**⚠️ 로컬 개발 전용 구현**: 인사이트 생성은 실제 Anthropic API 키를 쓰지 않고, 로컬에 설치된 **Claude Code CLI(`claude`)를 서브프로세스로 실행**해서 만든다 (`src/insight/claude-cli-insight-generator.ts`의 `ClaudeCliInsightGenerator`). 로컬 머신에 `claude` CLI가 설치·로그인되어 있어야 이 기능이 동작한다.

- `NODE_ENV=production`에서는 `POST /insights/generate` 호출 시 바로 502를 던진다 — 프로덕션에서는 아직 이 기능을 쓸 수 없다.
- `InsightGenerator` 포트(`insight-generator.port.ts`) 뒤에 구현체를 숨겨둔 어댑터 구조라, 나중에 실제 API 키 기반 구현(예: Anthropic Messages API 직접 호출)으로 교체할 때 `insight.module.ts`의 provider만 바꾸면 된다.
- 실행 커맨드: `claude -p <prompt> --output-format json --json-schema <스키마> --allowedTools '' --strict-mcp-config` — 텍스트 생성만 필요하므로 도구/MCP 접근은 전부 차단.

## 아키텍처 노트

- `prisma/schema.prisma`: `DevLog` – `Tag` – `DevLogTag`(조인 테이블) 다대다 구조. Tag를 별도 애그리거트로 두지 않고 정규화 저장만 하는 이유는 [도메인 모델 문서](../docs/domain-model.md#32-devlog-aggregate-devlog-context--핵심-애그리거트) 참고.
- `src/prisma/`: `PrismaService`/`PrismaModule` (전역 모듈)
- `src/devlog/`: 컨트롤러/서비스/DTO
- `src/users/`: `User` 조회/find-or-create, `deleteAccountAndData`(계정+DevLog 영구 삭제, 트랜잭션) (Identity Context)
- `src/auth/`: Passport 전략(Google/Kakao/JWT), JWT 발급, 로그인/콜백/me/logout/회원탈퇴 컨트롤러. `JwtStrategy`는 토큰 서명뿐 아니라 매 요청마다 계정이 실제로 존재하는지 DB로 확인한다 (회원탈퇴 후 만료 전 토큰이 재사용되는 것을 방지).
- `src/common/decorators/owner-id.decorator.ts`: `JwtAuthGuard` 통과 후 `request.user.id`를 꺼내는 파라미터 데코레이터

## Lint / Format

```bash
npm run lint
npm run format
```
