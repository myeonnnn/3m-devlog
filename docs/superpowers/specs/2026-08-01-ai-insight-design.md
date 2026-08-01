# AI 회고 요약 & 성장 인사이트 — 설계

- 요구사항: [`requirements/2026-W31/3m-log 요구사항_20260801.md`](../../../requirements/2026-W31/3m-log%20요구사항_20260801.md)
- 상태: 설계 승인됨, 구현 전

## 1. 개요

로그인한 사용자가 본인이 작성한 DevLog를 바탕으로, 원하는 시점에 주간(ISO 주차)/월간(캘린더월) AI 회고 요약을 요청해 볼 수 있는 기능. 결과는 기간당 최신 1건만 서버에 저장되며, 재요청 시 덮어쓴다.

## 2. 바운디드 컨텍스트 / 애그리거트

기존 `docs/domain-model.md`는 컨텍스트당 모듈 1개 원칙(Identity → `src/users`, DevLog → `src/devlog`)을 따른다. Insight는 DevLog를 읽기 전용으로 참조하되 독립적인 생명주기(생성·덮어쓰기)를 가지므로, 새 **Insight Context**(`src/insight/`)로 분리한다. DevLog 애그리거트 자체는 변경하지 않는다(순수 조회만 사용).

```
Insight (Aggregate Root)
  id: string (uuid)
  ownerId: string
  periodType: WEEKLY | MONTHLY
  periodKey: string            # "2026-W31" (ISO 주차) | "2026-08" (캘린더월)
  summary: string              # 문장형 요약 — LLM 생성
  patterns: string[]           # 반복된 문제/시행착오 패턴 — LLM 생성
  logCount: number             # 해당 기간 로그 수 — 서버가 직접 카운트 (LLM 환각 방지, 수치는 결정론적으로 계산)
  generatedAt: DateTime

  invariant: unique(ownerId, periodType, periodKey) — 같은 기간 재요청 시 upsert로 덮어씀, 기간당 최신 1건만 유지
```

Prisma 스키마 추가 (기존 컨벤션: `uuid()` id, DevLog와 동일 스타일):

```prisma
enum InsightPeriodType {
  WEEKLY
  MONTHLY
}

model Insight {
  id          String            @id @default(uuid())
  ownerId     String
  periodType  InsightPeriodType
  periodKey   String
  summary     String
  patterns    String[]
  logCount    Int
  generatedAt DateTime          @default(now())

  @@unique([ownerId, periodType, periodKey])
  @@index([ownerId])
}
```

## 3. API 계약

베이스 경로 `/insights`. 모든 요청 로그인(쿠키) 필요, 없으면 401 (기존 `JwtAuthGuard` 재사용).

| Method | Path | 설명 |
|---|---|---|
| POST | `/insights/generate` | 인사이트 생성/재생성 (upsert) |
| GET | `/insights/latest` | 마이페이지용 — 주간/월간 각각 최신 1건 |

**`POST /insights/generate`**
- body: `{ periodType: "WEEKLY" | "MONTHLY", periodKey: string }`
- `periodKey` 형식: 주간 `YYYY-'W'ww`(ISO 주차), 월간 `YYYY-MM`
- 응답:
  - `200 Insight` — 생성/덮어쓰기 성공 (동기 처리, CLI 서브프로세스 응답까지 대기)
  - `400` — `periodKey` 형식 오류 또는 미래 기간 (오늘이 속한 주/월보다 미래)
  - `422` — 해당 `(ownerId, periodType, periodKey)` 범위에 로그 0건. **AI 호출 전에 서버가 먼저 카운트로 차단** — 불필요한 LLM 호출/저장 방지
  - `502` — CLI 실행 실패, 타임아웃(60초), 또는 LLM 응답이 지정 스키마에 맞지 않음

**`GET /insights/latest`**
- 응답: `{ weekly: Insight | null, monthly: Insight | null }`

## 4. 인사이트 생성 흐름

1. `InsightService.generate(ownerId, periodType, periodKey)`
2. `periodKey` 형식·미래 여부 검증 (400)
3. `periodType`/`periodKey`를 실제 날짜 범위로 변환 (ISO 주차 → 월~일, 캘린더월 → 1일~말일)
4. `DevLogRepository`로 해당 `ownerId` + 날짜범위의 로그 조회. 0건이면 422
5. 로그 수(`logCount`)는 이 조회 결과 길이로 서버가 직접 계산
6. 로그들의 `learnedNote`/`troubleshootingNote`/`tomorrowTask`/`tags`를 모아 프롬프트 구성, `InsightGenerator` 포트 호출 → `{ summary, patterns }`
7. `logCount`와 합쳐 `Insight` upsert (unique 제약으로 덮어쓰기)
8. 저장된 `Insight` 반환

## 5. AI 연동 — `InsightGenerator` 포트

```ts
interface InsightGenerator {
  generate(input: { logs: DevLogSummaryInput[] }): Promise<{ summary: string; patterns: string[] }>;
}
```

**로컬 구현체 `ClaudeCliInsightGenerator`** (이번 범위 — 실제 API 키 없이 로컬 Claude Code CLI로 우회):
- 설치된 `claude` CLI를 Node `child_process`로 서브프로세스 실행:
  ```
  claude -p "<prompt>" \
    --output-format json \
    --json-schema '{"type":"object","properties":{"summary":{"type":"string"},"patterns":{"type":"array","items":{"type":"string"}}},"required":["summary","patterns"]}' \
    --disallowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch,NotebookEdit" \
    --permission-mode bypassPermissions
  ```
- 순수 텍스트 생성 작업이라 파일시스템/도구 접근이 전혀 필요 없음 → `--disallowedTools`로 전체 차단
- cwd를 저장소 밖 임시 디렉터리로 지정 — 이 레포의 `CLAUDE.md`/프로젝트 컨텍스트가 프롬프트에 섞이지 않게 함
- 타임아웃 60초, non-zero exit / JSON 파싱 실패 / 스키마 불일치 시 예외 → 컨트롤러에서 502로 매핑
- **교체 가능성**: 포트만 구현하면 되므로, 추후 실제 Anthropic API 키를 발급받으면 같은 인터페이스의 `AnthropicApiInsightGenerator`로 NestJS provider 토큰만 바꿔 교체 (환경변수 유무로 분기하는 정도만 추가, 지금은 구현하지 않음 — YAGNI)

**프롬프트 입력**: 기간 내 로그들의 `learnedNote`/`troubleshootingNote`/`tomorrowTask`/`tags`. `logCount`는 프롬프트에 포함하지 않음(서버가 별도 계산).

## 6. 기간 선택 정책

- 주간 = ISO 주차, 월간 = 캘린더월 (요구사항 확정 사항)
- **과거 기간 선택 가능** — 이전/다음 화살표로 한 단위씩 이동 (`‹ 2026-W31 ›` 형태). 과거 방향 제한 없음
- **미래 기간 선택 불가** — 오늘이 속한 주/월이 최신 선택지, 다음 화살표는 그 이상 비활성화. 서버도 400으로 방어적 재검증
- 로그가 0건인 과거 기간을 선택해 생성 요청하면 422(AI 호출 없이 안내만)

## 7. 프론트엔드

- 헤더 스트릭 배지 근처에 인사이트 진입점 아이콘 추가. **게스트 모드에는 미노출** (서버에 `ownerId` 없는 것과 동일한 이유로 애초에 대상 아님)
- 클릭 → `InsightModal`:
  - 상단 주간/월간 토글
  - `‹ 2026-W31 ›` 형태 기간 이동 컨트롤 (미래 방향 비활성화)
  - "생성하기" 버튼 → 로딩 상태("AI가 회고를 작성하는 중...") — CLI 서브프로세스라 수 초 소요
  - 결과: 요약 문장 / 반복 패턴 리스트 / 활동 수치(로그 수)
  - 빈 기간(422): "이 기간에 기록이 없습니다" 안내
  - 실패(502/기타): "인사이트 생성에 실패했습니다, 다시 시도해주세요" — 자동 재시도 없음
- 마이페이지에 "인사이트 기록" 섹션 신설 — `GET /insights/latest`로 주간/월간 최신 결과 각 1개 카드 표시 (없으면 "아직 생성한 인사이트가 없습니다")
- 계층 분리 기존 패턴 유지: `src/lib/insight-api.ts`(fetch), `src/hooks/use-insights.ts`(React Query), `src/components/insight/`(프레젠테이션 전용)

## 8. 에러 처리 요약

| 상황 | 서버 응답 | 프론트 동작 |
|---|---|---|
| 로그 0건 | 422 | "이 기간에 기록이 없습니다" 안내, AI 호출 자체가 없었음 |
| 미래 기간 요청 | 400 | UI에서 대부분 사전 차단(다음 화살표 비활성화), 방어적 처리 |
| CLI 실패/타임아웃/스키마 불일치 | 502 | 실패 토스트, 재시도는 사용자가 버튼 다시 클릭 |
| 인증 없음 | 401 | 기존 인증 흐름과 동일 |

## 9. 테스트 계획

**서버**
- 유닛: `periodKey` 형식·미래 여부 검증, ISO 주차/캘린더월 → 날짜범위 변환, `logCount` 계산, `InsightService` 오케스트레이션(`InsightGenerator`는 mock), 같은 기간 재요청 시 upsert로 덮어쓰는지
- e2e: 실제 `claude` CLI 호출은 느리고 비결정적이라 제외 — 테스트 모듈에서 `InsightGenerator`를 가짜 구현으로 override해 생성 성공/422(빈 기간)/400(미래 기간)/401 흐름 검증

**클라이언트**
- 유닛: 기간 이동 컨트롤의 미래 방향 비활성화, 주간/월간 토글, 빈 결과·에러 상태 렌더링

**수동 확인**
- 실제 로컬 `claude` CLI 서브프로세스 호출까지 한 번은 브라우저에서 end-to-end 확인 (첫 실행이라 CLI 인증/권한 이슈 유무 확인 필요)

## 10. 이번 범위에서 제외

- 정기 자동 생성/알림 (요구사항에서 명시적으로 제외)
- 과거 기간 인사이트 이력 전체 목록 (기간당 최신 1건만 유지하므로 불필요)
- 실제 Anthropic API 키 연동 (포트는 준비하되 구현은 다음 세션)
