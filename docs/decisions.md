# 결정 로그 (Architecture Decision Log)

되돌리기 어렵고 나중에 재논쟁될 가능성이 높은 기술적/아키텍처 결정만 기록한다. 한 번 추가한 항목은 수정하지 않는다 — 결정이 바뀌면 기존 항목을 고치지 말고 새 항목을 추가하며 "ADR-XXXX를 대체함"이라고 명시한다.

## 언제 쓰는가

다음 두 조건을 **모두** 만족할 때만 추가한다.
- 되돌리는 데 비용이 크다 (라이브러리/아키텍처/인증 방식 등 넓은 범위에 영향)
- 나중에 "왜 이렇게 안 했지?"라는 질문이 나올 가능성이 높다

리팩토링, 변수명, 함수 분리처럼 되돌리기 쉬운 것은 대상이 아니다. 운영/트러블슈팅성 함정(Node 버전, 포트 충돌 등)은 여기가 아니라 [`CLAUDE.md`](../CLAUDE.md)의 "재발 가능성 높은 함정" 섹션에 남긴다.

`docs/domain-model.md`/`docs/policies.md`는 "지금 현재 상태가 무엇인가"만 담고 변경 이력을 남기지 않는다. 이 파일은 그 반대로 "왜 그렇게 결정했는가"의 이력만 담는다 — 서로 역할이 겹치지 않는다.

## 포맷

```
## ADR-0001: 제목 (YYYY-MM-DD, Accepted)
**맥락**: 어떤 문제/제약 때문에 결정이 필요했는가
**결정**: 무엇을 선택했는가
**트레이드오프**: 기각한 대안과 그 이유, 감수한 단점
```

관련 있는 `requirements/`, `docs/domain-model.md`, `docs/policies.md` 쪽에서는 해당 대목에 `[ADR-0001](../docs/decisions.md#adr-0001)`처럼 앵커 링크로 이 로그를 참조한다 (경로는 참조하는 파일 위치 기준으로 조정).

---

<!-- 아래부터 실제 결정을 번호 순으로 append한다. 과거 결정을 소급해서 채울 땐, 그 결정이 내려질 당시의 맥락/트레이드오프를 정확히 아는 경우에만 작성한다 (추측으로 채우지 않는다). -->

## ADR-0001: view 폼에 React Hook Form + Zod 도입 (2026-08-07, Accepted)
**맥락**: `DevLogFormModal`이 필드마다 `useState`를 나열하고, 검증은 `validateDevLogForm`이라는 수기 순수 함수 하나로 처리하고 있었다. 또한 게스트 모드의 `guestStorage`는 `localStorage`에서 읽은 값을 `JSON.parse(raw) as DevLog[]`로 타입 단언만 하고 실제 모양은 검사하지 않아, devtools 등으로 저장소를 직접 조작하면 깨진 데이터를 그대로 신뢰하는 구멍이 있었다.

**결정**: 클라이언트 폼 상태 관리에 `react-hook-form`을, 런타임 스키마 검증에 `zod`를 도입한다. 적용 범위는 **폼 입력**(`DevLogFormModal` → `devLogFormSchema`)과 **게스트 localStorage 읽기 경계**(`guestStorage.readAll` → `storedDevLogsSchema`)로 한정한다. 인증 모드에서 서버가 응답하는 DevLog 데이터는 대상에서 제외한다 — `hey-api`가 Swagger 스펙에서 이미 컴파일타임 타입(`DevLogResponseDto` 등)을 생성해주고 있어서, 여기에 zod 스키마까지 추가하면 같은 모양을 수동으로 한 번 더 정의/유지해야 하는 이중 관리 비용이 생기기 때문이다.

**트레이드오프**: 서버 응답까지 zod로 감싸는 안(런타임에도 서버 계약을 검증)을 검토했으나 기각했다 — hey-api 코드젠을 도입한 최근 결정(devlog API 레이어를 hey-api SDK + TanStack Query로 통일)과 방향이 어긋나고, 필드 추가/변경 시 두 곳(OpenAPI 스펙 → hey-api 생성 타입, 손으로 쓴 zod 스키마)을 계속 동기화해야 한다. 대신 실제로 컴파일타임 보장이 전혀 없는 지점(사용자 입력, 외부에서 조작 가능한 localStorage)에만 zod를 적용해 검증 가치가 높은 곳에 비용을 집중시켰다.
