# 3m-log 도메인 모델 (DDD)

요구사항 문서(`3m-log 요구사항_20260723.md`) 기반의 전략적/전술적 설계 초안. 로직 구현 전, 애그리거트 경계와 컨텍스트 관계를 먼저 정리한다.

## 1. 유비쿼터스 언어

| 용어 | 의미 |
|---|---|
| User | 소셜 로그인(구글/카카오)으로 식별되는 서비스 이용자 |
| DevLog | 하루 단위로 작성하는 개발 기록 (배운점 + 버그 + 내일 할 일 + 태그) |
| LearnedNote | 오늘 배운 점 (필수 입력) |
| TroubleshootingNote | 해결한 버그 / 시행착오 (선택 입력) |
| TomorrowTask | 내일 할 일 (선택 입력) |
| Tag | 로그 분류 키워드. 대소문자 무관하게 동일 태그로 취급 |
| Owner | DevLog를 작성한 User. 본인만 조회/수정/삭제 가능 |

## 2. 바운디드 컨텍스트

```mermaid
flowchart LR
    subgraph ext["외부 시스템"]
        Google["Google OAuth"]
        Kakao["Kakao OAuth"]
    end

    subgraph IdentityCtx["Identity Context (지원 서브도메인)"]
        User["User Aggregate"]
    end

    subgraph DevLogCtx["DevLog Context (핵심 도메인)"]
        DevLog["DevLog Aggregate"]
    end

    Google -->|"프로필 정보"| IdentityCtx
    Kakao -->|"프로필 정보"| IdentityCtx
    IdentityCtx -->|"UserId (참조만 전달, Customer-Supplier)"| DevLogCtx
```

- **Identity Context**: OAuth 제공자(Google/Kakao)로부터 받은 프로필을 내부 `User`로 변환(ACL 역할). 핵심 도메인이 아니므로 최소 기능만 유지.
- **DevLog Context**: 실제 비즈니스 가치가 있는 핵심 도메인. `User` 전체가 아니라 `UserId`만 참조 — 두 컨텍스트를 강결합하지 않기 위함.
- 별도의 "Search Context"는 두지 않는다. 검색/인기태그는 DevLog 컬렉션에 대한 조회(Read Model) 관심사이지 독자적 애그리거트가 필요한 영역이 아님 (불필요한 컨텍스트 분리는 이 단계 규모에서 과설계).

## 3. 애그리거트 설계

### 3.1 User Aggregate (Identity Context)

```mermaid
classDiagram
    class User {
        <<Aggregate Root>>
        +UserId id
        +AuthProvider provider
        +String providerUserId
        +String displayName
        +String email
        +DateTime createdAt
    }
    class AuthProvider {
        <<enum>>
        GOOGLE
        KAKAO
    }
    User --> AuthProvider
```

- 불변식: `(provider, providerUserId)` 쌍은 유일 — 최초 로그인 시 JIT(Just-In-Time) 프로비저닝의 조회 키.
- User는 자기 완결적이며 DevLog를 직접 참조하지 않는다 (참조 방향은 DevLog → UserId 단방향).

### 3.2 DevLog Aggregate (DevLog Context) — 핵심 애그리거트

```mermaid
classDiagram
    class DevLog {
        <<Aggregate Root>>
        +DevLogId id
        +UserId ownerId
        +Date logDate
        +LearnedNote learnedNote
        +TroubleshootingNote troubleshootingNote
        +TomorrowTask tomorrowTask
        +Set~Tag~ tags
        +DateTime createdAt
        +DateTime updatedAt
    }
    class LearnedNote {
        <<Value Object>>
        +String text
    }
    class TroubleshootingNote {
        <<Value Object, Optional>>
        +String text
    }
    class TomorrowTask {
        <<Value Object, Optional>>
        +String text
    }
    class Tag {
        <<Value Object>>
        +String displayName
        +String normalized
    }

    DevLog *-- LearnedNote : 필수 1
    DevLog *-- TroubleshootingNote : 선택 0..1
    DevLog *-- TomorrowTask : 선택 0..1
    DevLog *-- "0..*" Tag
```

- **경계 안(애그리거트 내부에서 강제되는 불변식)**
  - `LearnedNote`는 공백일 수 없음 (필수 입력).
  - `Tags`는 `normalized`(소문자 trim) 기준 중복 없음 — `React`와 `react`는 저장 시점에 하나로 합쳐짐, `displayName`은 최초 입력값 유지.
  - 수정/삭제는 `ownerId == 요청자 UserId`인 경우에만 허용 (권한 검사는 애그리거트가 요청자 컨텍스트를 알고 커맨드를 거부하는 형태로 표현 — 상세는 애플리케이션 레이어에서 구체화).
- **Tag를 별도 애그리거트로 분리하지 않은 이유**: Tag 자체는 독립적 생명주기나 식별자가 필요 없음. "인기 태그"는 Tag의 상태가 아니라 DevLog 컬렉션에 대한 집계 쿼리 결과이므로, Tag를 애그리거트로 승격시키면 DevLog 저장 시마다 별도 트랜잭션/동시성 문제만 늘어남 (과설계 방지).

## 4. 리포지토리 경계

```mermaid
classDiagram
    class UserRepository {
        <<interface>>
        +findByProviderIdentity(provider, providerUserId) User
        +save(User)
    }
    class DevLogRepository {
        <<interface>>
        +findById(DevLogId) DevLog
        +findByOwnerId(UserId, filter) List~DevLog~
        +save(DevLog)
        +deleteById(DevLogId)
    }
```

- 애그리거트당 리포지토리 1개 원칙 준수. `DevLog` 조회는 항상 `ownerId` 스코프로 제한 (요구사항 "내 기록만 관리").

## 5. 도메인 이벤트 (최소 초안)

| 이벤트 | 발생 시점 |
|---|---|
| UserRegistered | 최초 소셜 로그인으로 User가 생성될 때 |
| DevLogCreated | DevLog 작성 완료 시 |
| DevLogUpdated | DevLog 수정 시 |
| DevLogDeleted | DevLog 삭제 시 |

현재 요구사항에는 이벤트를 구독하는 사이드이펙트(알림 등)가 없으므로, 지금 단계에서는 이벤트를 정의만 해두고 실제 발행/구독 인프라는 구현하지 않는다.

## 6. Read Model (애그리거트 외부, 조회 전용)

- **검색**: `ownerId` 스코프 내에서 키워드로 `learnedNote` / `troubleshootingNote` / `tomorrowTask` 조회 (세 필드 모두 대상, 확정).
- **인기 태그 집계**: `ownerId` 스코프 내에서 `tags.normalized` 별 빈도 집계 (확정, 2026-07-28 요구사항으로 재변경). 인증 필요.

→ 두 기능 모두 DevLog 애그리거트의 상태를 변경하지 않는 순수 조회이므로 CQRS의 Query 사이드로 분리 가능 (지금 단계에서는 단순 조회 쿼리로 충분, 별도 프로젝션 테이블은 불필요).

## 7. 확인된 사항

이전 요구사항 분석에서 제기됐던 질문들의 결론:

1. **검색 범위**: `learnedNote`/`troubleshootingNote`/`tomorrowTask` 모두 전문검색 대상 (확정).
2. **인기 태그 집계 기준**: 본인 로그(`ownerId`) 기준으로 재확정 — 2026-07-23 문서 당시 "전체 사용자" 기준으로 정했다가, 2026-07-28 요구사항에서 다시 본인 기준으로 뒤집힘.
3. **태그 정규화 저장 방식**: 최초 입력값을 `displayName`으로 보존, `normalized`로만 중복 판정 (확정, 구현됨).
