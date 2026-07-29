# server — 3m-devlog API 서버

NestJS 기반 API 서버. 서비스 개요·전체 API 명세·배포는 [루트 README](../README.md) 참고.

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

값이 비어있으면(placeholder) 서버는 뜨지만 해당 소셜 로그인 시도 시 에러가 난다. 단, `clientID`가 완전히 빈 문자열이면 Passport 전략 생성자에서 부팅 자체가 실패하므로 placeholder 문자열은 유지해야 한다. 발급 방법 상세는 [루트 README](../README.md#1-server) 참고.

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

## 테스트

```bash
make test        # 유닛 테스트 (DevLogService, Prisma는 mock)
make test-e2e     # e2e (Postgres 기동 후 실행)
make test-all     # 유닛 + e2e
```

- Prisma 7 클라이언트가 WASM 쿼리 컴파일러를 동적 import하므로 e2e는 `NODE_OPTIONS=--experimental-vm-modules`로 실행한다 (`test:e2e` 스크립트에 포함됨).
- e2e 테스트가 만든 데이터는 종료 시 자동 정리된다.

## API

전체 엔드포인트 목록은 [루트 README](../README.md#api-server) 참고. Postman으로 테스트하려면 `postman_collection.json`을 임포트 (로그인 라우트는 브라우저 리다이렉트 흐름이라 Postman만으로는 전체 플로우 테스트가 어렵다 — 브라우저에서 로그인 후 쿠키를 복사해 사용).

## Lint / Format

```bash
npm run lint
npm run format
```
