<div align="center">

<img src="./docs/images/banner.svg" alt="3m-devlog" width="640" />

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

요구사항: [`requirements/2026-W30/3m-log 요구사항_20260723.md`](./requirements/2026-W30/3m-log%20요구사항_20260723.md) · 도메인 모델: [`docs/domain-model.md`](./docs/domain-model.md)

</div>

## 스크린샷

| 메인 화면 (게스트 모드) | 로그 작성 |
|---|---|
| ![메인 화면](./docs/images/main-feed.jpg) | ![로그 작성 모달](./docs/images/write-modal.jpg) |

## Goal

이 프로젝트의 목적은 서비스 자체보다 AI와 함께 문제를 정의하고 개발하는 과정에 있습니다.

## AI Workflow

새 요구사항이 들어오면 아래 순서로 처리합니다.

```mermaid
flowchart LR
    A[요구사항 문서화] --> B[설계 · 정책 반영]
    B --> C[작업 분해]
    C --> D[구현 + 테스트]
    D --> E[회고]
    E -.-> A
```

### 1. 요구사항 문서화

요구사항은 한 번에 확정하지 않고 [`requirements/`](./requirements)에 버전별 문서로 남깁니다. 기존 문서를 베이스로 추가/변경되는 내용만 정리합니다.

### 2. 설계 영향 확인

구조(애그리거트, 컨텍스트 등)에 영향이 있으면 [`docs/domain-model.md`](./docs/domain-model.md)를 갱신합니다. 단순 정책 변경이면 건너뜁니다.

### 3. 정책 반영

비즈니스 규칙이 새로 생기거나 바뀌면 [`docs/policies.md`](./docs/policies.md)를 현재 상태로 갱신합니다. 변경 이력은 남기지 않습니다 — 요구사항 문서와 [`tasks/`](./tasks)가 그 역할을 합니다.

### 4. 작업 분해

[`tasks/`](./tasks) 안 ISO 주차별 파일로 요구사항별 체크리스트를 관리하며 진행 상황을 추적합니다 (자세한 폴더 구조는 [`tasks/README.md`](./tasks/README.md) 참고).

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
server/   # NestJS API 서버
view/     # Next.js 프론트엔드
```

로컬 실행, API 명세, 테스트, 아키텍처 노트는 각 서브 프로젝트 README 참고: [`server/README.md`](./server/README.md), [`view/README.md`](./view/README.md). 배포 관련 내용은 [`docs/deployment.md`](./docs/deployment.md) 참고.
