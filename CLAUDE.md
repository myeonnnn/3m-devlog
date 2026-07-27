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

3분 개발 로그 서비스. 상세 스택/실행법은 [README.md](./README.md) 참고. v1은 view(Next.js)/server(NestJS) 완전 분리 구조.

**재발 가능성 높은 함정:**
- Node는 반드시 LTS(v24+) 사용. v18에서는 Next 16 typegen, tailwind oxide 네이티브 바이너리, Prisma 엔진이 다 깨짐.
- `nvm use default`는 다음 Bash 호출에 안 남음(툴이 명령마다 새 셸 실행) — Node 필요한 커맨드엔 매번 `source $(brew --prefix nvm)/nvm.sh && nvm use default &&`를 같이 붙일 것.
- Prisma 7: `schema.prisma`의 `generator client`에 `moduleFormat = "cjs"` 필수, `@prisma/adapter-pg` 드라이버 어댑터 없으면 클라이언트 생성 자체가 실패함.
- Nest 서버 기본 포트가 3000이라 Next 개발 서버(3000)와 충돌 — server는 `PORT=3001`로 띄움.
- 소셜 로그인 미구현 상태라 `ownerId`는 `x-user-id` 헤더로 임시 전달 (서버: `OwnerId` 데코레이터, 프론트: `lib/user-id.ts`).
- 이 레포는 여러 워크트리 세션이 동시에 `v1`에 푸시할 수 있음 — push 전 `git fetch`로 원격이 앞서 있는지 확인, rejected면 `git pull origin v1 --no-rebase` 후 재푸시.
- `v1/server` 테스트: `make test`(유닛) / `make test-e2e`(Postgres 기동 후 e2e) / `make test-all`.
