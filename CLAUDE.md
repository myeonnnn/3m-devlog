# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 3m-devlog 프로젝트 노트

3분 개발 로그 서비스. 상세 스택/실행법은 [README.md](./README.md) 참고. view(Next.js)/server(NestJS) 완전 분리 구조 (저장소 루트 바로 아래 `server/`, `view/`; 브랜치명 `v1`은 폴더 구조와 무관).

## 새 요구사항 처리 절차 (workflow)

`requirements/`(요구사항 문서)와 `tasks/`(진행 체크리스트)는 별도 폴더로 분리되어 있고, 둘 다 ISO 주차 단위(`YYYY-Www`)로 관리한다 — 구조는 [`requirements/README.md`](./requirements/README.md), [`tasks/README.md`](./tasks/README.md) 참고.

새 요구사항이 들어오면 아래 순서를 따른다 (상세 이유: README.md "AI Workflow"):
1. 현재 ISO 주차 폴더(`requirements/YYYY-Www/`, 없으면 새로 생성)에 버전별 문서 추가 (기존 문서 베이스로 변경분만 정리)
2. 구조(애그리거트/컨텍스트)에 영향 있으면 `docs/domain-model.md` 갱신, 없으면 스킵
3. 비즈니스 규칙 변경 시 `docs/policies.md`를 현재 상태로 갱신 (변경 이력은 안 남김)
4. `tasks/YYYY-Www.md`(현재 ISO 주차, 없으면 새로 생성)에 체크리스트 추가
5. 구현 + 테스트, 체크리스트 항목 완료 처리
6. 세션 끝나면 이번에 배운 것을 이 파일(CLAUDE.md)에 반영

**예외 — 문서화 안 된 애드혹 요청** (인프라/리팩터링/스타일링 등 채팅으로 바로 지시받은, 별도 요구사항 문서가 없는 변경): `tasks/`에는 기록하지 않는다. `tasks/`는 제품 요구사항(문서화된 것) 기반 체크리스트 전용이고, 개발 중 생기는 이슈·지시·리팩토링 등은 커밋 메시지로 남긴다. 구조/정책에 실제로 영향이 있으면 2·3번(domain-model.md/policies.md 갱신)만 평소대로 수행.

**재발 가능성 높은 함정:**
- Node는 반드시 LTS(v24+) 사용. v18에서는 Next 16 typegen, tailwind oxide 네이티브 바이너리, Prisma 엔진이 다 깨짐.
- `nvm use default`는 다음 Bash 호출에 안 남음(툴이 명령마다 새 셸 실행) — Node 필요한 커맨드엔 매번 `source $(brew --prefix nvm)/nvm.sh && nvm use default &&`를 같이 붙일 것.
- Prisma 7: `schema.prisma`의 `generator client`에 `moduleFormat = "cjs"` 필수, `@prisma/adapter-pg` 드라이버 어댑터 없으면 클라이언트 생성 자체가 실패함.
- Nest 서버 기본 포트가 3000이라 Next 개발 서버(3000)와 충돌 — server는 `PORT=3001`로 띄움.
- 소셜 로그인(Google/Kakao) 구현 완료, JWT를 httpOnly 쿠키로 발급. `ownerId`는 `OwnerId` 데코레이터가 `request.user.id`(JwtAuthGuard가 채움)에서 꺼냄.
- Passport 전략(Google/Kakao)은 생성자에서 `clientID`가 falsy(`""` 등)면 서버 부팅 자체가 죽음 — 자격증명 없을 때도 placeholder 비-빈 문자열 유지.
- `@types/passport-kakao`의 `profile.id` 타입은 `string`이지만 실제 런타임 값은 number — Prisma에 넘기기 전 `String(profile.id)` 변환 필요.
- e2e 테스트 앱(`createNestApplication()`)은 `main.ts`의 `app.use(cookieParser())` 등을 자동 상속하지 않음 — 쿠키 인증 테스트하려면 테스트 파일에서 직접 다시 붙여야 함.
- 이 레포는 여러 워크트리 세션이 동시에 `v1`에 푸시할 수 있음 — push 전 `git fetch`로 원격이 앞서 있는지 확인, rejected면 `git pull origin v1 --no-rebase` 후 재푸시.
- `server` 테스트: `make test`(유닛) / `make test-e2e`(Postgres 기동 후 e2e) / `make test-all`.
- Claude Code CLI를 서브프로세스로 호출할 때 `--output-format json --json-schema '<스키마>'`를 같이 주면 최상위 응답에 `structured_output` 필드로 스키마에 맞게 이미 파싱된 객체가 온다 (`result`는 같은 내용의 문자열이라 이중 파싱 불필요). `is_error` 필드로 실패 여부 확인. `--disallowedTools`로 불필요한 도구(Bash/Read/Write/...)를 막아도 정상 동작.
- Nest 컨트롤러가 `null`을 그대로 반환하면 Express 어댑터가 `response.end()`만 호출해 **빈 바디**로 응답한다(JSON `"null"`이 아님) — 클라이언트의 `res.json()`이 빈 바디를 파싱하다 `SyntaxError`로 죽는다. "값 없음"을 응답해야 하는 GET 엔드포인트는 top-level에 `null`을 바로 리턴하지 말고 `{ data: null }`처럼 객체로 감싼다. e2e 테스트로 실제 HTTP 응답 바디를 assert해야 잡히는 종류의 버그이니, unit 테스트(서비스 레이어)만으로는 이 케이스를 놓친다.
