---
name: my-workflow-init
description: 요구사항 문서(requirements/)와 진행 체크리스트(tasks/)를 ISO 주차 폴더 단위로 분리 관리하는 워크플로우를 현재 프로젝트에 부트스트랩한다. domain-model.md/policies.md 스텁, CLAUDE.md 절차 섹션까지 포함. "이 워크플로우 이식해줘", "요구사항 워크플로우 세팅해줘", "requirements/tasks 구조 만들어줘" 같은 요청에 사용.
---

# my-workflow-init

요구사항 문서화 → 설계/정책 반영 → 작업 분해 → 구현 → 회고로 이어지는 절차를, 새 프로젝트에도 같은 폴더 구조/문서로 그대로 옮겨 쓰기 위한 스캐폴딩 스킬. 이 스킬 자체가 만드는 산출물(각 템플릿 파일)은 `templates/`에 있으며, 그 내용을 그대로 복사해 붙여넣는다 — 즉석에서 다시 작성하지 않는다.

## 0. 대상 프로젝트 확인

- 현재 작업 디렉터리가 프로젝트 루트가 맞는지 확인한다 (애매하면 사용자에게 확인).
- `requirements/`, `tasks/`, `docs/policies.md`, `docs/domain-model.md`, `CLAUDE.md`가 이미 있는지 `ls`/`Read`로 먼저 확인한다. 이미 있으면 덮어쓰지 말고, 무엇이 있는지 보여주고 사용자에게 어떻게 할지 묻는다 (건너뛸지 / 병합할지).

## 1. requirements/, tasks/ 스캐폴드

- `requirements/README.md` ← `templates/requirements-README.md` 그대로 복사.
- `tasks/README.md` ← `templates/tasks-README.md` 그대로 복사.
- 이 시점엔 실제 ISO 주차 폴더/파일(`requirements/YYYY-Www/`, `tasks/YYYY-Www.md`)은 만들지 않는다 — 첫 요구사항이 들어올 때 그때 생성한다 (빈 폴더를 미리 만들어두지 않는다).

## 2. docs/ 스텁

- `docs/policies.md`가 없으면 `templates/policies.md`로 생성.
- `docs/domain-model.md`가 없으면 `templates/domain-model.md`로 생성. 이미 다른 설계 문서가 있다면 강제로 만들지 않는다 (사용자에게 확인).

## 3. CLAUDE.md에 절차 섹션 추가

- `CLAUDE.md`가 없으면 새로 만들고, 있으면 기존 내용 끝에 `templates/CLAUDE-section.md` 내용을 추가한다 (기존 내용을 건드리지 않는다).
- 프로젝트에 이미 다른 "새 요구사항 처리 절차" 류 섹션이 있으면 대체할지 나란히 둘지 사용자에게 확인한다.

## 4. 마무리

- 무엇을 만들었고 무엇을 스킵했는지 목록으로 요약한다.
- 커밋은 사용자가 명시적으로 요청할 때만 한다.

## 하지 않는 것

- 기존 requirements/tasks/docs/CLAUDE.md 내용을 확인 없이 덮어쓰거나 삭제하는 것.
- README 수정 — 이 스킬은 문서/폴더 구조만 세팅한다. README에 워크플로우를 소개하고 싶으면 별도로 요청한다.
- `CLAUDE-section.md`의 애드혹 예외 조항(1번만 생략하고 2·3번은 동일하게 탄다)을 임의로 단순화하는 것 — 애드혹 요청이 구조/정책 체크까지 건너뛰면 안 된다.
