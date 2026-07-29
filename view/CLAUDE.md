@AGENTS.md

## 디자인 시스템
UI를 새로 만들거나 스타일을 고칠 땐 항상 [`docs/design-system.md`](../docs/design-system.md)의 컬러/타이포/컴포넌트 토큰을 따를 것. 임의로 색상·폰트·radius 값을 새로 정하지 않는다.

## 폴더 구조
타입 기준이 아니라 **기능(도메인) 기준**으로 분리한다. 파일 수가 적어도 기능이 늘어날 걸 대비해 처음부터 이 구조를 쓴다 (하나로 합쳐두면 나중에 구조 확장 없이 계속 그 안에서만 작업하게 됨).

```
src/
├── app/                 # Next.js 라우트 전용. 여러 feature를 조립만 함
├── components/          # 앱 전역 공통 UI (특정 feature에 속하지 않는 것만)
├── lib/                  # 외부 라이브러리 초기화/설정 (api-client, providers 등)
├── styles/               # 전역 스타일
├── utils/                # 도메인 무관 순수 유틸 (날짜 포맷 등)
├── hooks/, types/, assets/  # 전역 공통 훅/타입/정적 파일 — 실제로 필요해질 때 생성 (지금은 없음)
└── features/<name>/      # 기능(도메인) 단위 모듈
    ├── api/              # API 요청, 로컬 스토리지 등 데이터 접근
    ├── components/       # 이 feature 전용 UI
    ├── hooks/            # 이 feature의 React Query/상태 훅
    ├── rules/            # 이 feature 고유의 비즈니스 규칙(매직값·검증 등, React 미참조)
    ├── types/             # 이 feature의 타입
    └── index.ts           # 공개 API — 외부(app/, 다른 feature)가 실제로 쓰는 것만 export
```

- **`features/<name>/index.ts`는 완전 배럴이지만 전체 재수출이 아니라 "공개 API"다.** feature 내부에서만 쓰는 것(예: devlog의 `devlogApi`, `DevLogCard`, `rules/*`)은 export하지 않는다 — 외부가 실제로 import하는 것만 올린다.
- feature 간에는 서로 import하지 않는다 — 공유가 필요해지면 `components/`, `lib/`, `utils/` 등 전역 폴더로 올린다.
- 어떤 로직을 `utils/`(전역)에 둘지 `features/<name>/rules/`(도메인 전용)에 둘지는 "순수 함수인가"가 아니라 **"그 안에 도메인 고유의 비즈니스 규칙(매직값·메시지 등)이 들어있는가"**로 판단한다. 날짜 포맷처럼 어느 도메인에 갖다 써도 의미가 같으면 `utils/`, "태그는 5개까지" 같은 도메인 결정이 들어있으면 해당 feature의 `rules/`.
- 전역 `hooks/`/`types/`/`assets/`처럼 지금 넣을 파일이 없는 폴더는 미리 만들지 않는다 — 실제로 필요해질 때 생성한다.

## Node 버전 관련
`next dev`가 tailwind oxide 네이티브 바이너리를 못 찾으면: Node를 LTS로 전환 후 `rm -rf node_modules package-lock.json && npm install`로 재설치.

## 테스트
Vitest + React Testing Library (`npm test` 1회 실행, `npm run test:watch` watch 모드). 서버는 Jest를 쓰지만 클라이언트는 Next.js/Vite 계열과 궁합이 좋은 Vitest로 별도 채택.

- 테스트 파일은 대상 파일 옆에 콜로케이션 (`*.test.ts(x)`), 별도 `__tests__/` 폴더 안 씀 — feature colocation 원칙과 동일한 이유.
- 우선순위: `rules/`·`utils/`의 순수 함수(가장 싸고 값어치 높음) → 버그가 실제로 살기 쉬운 훅(`use-*.ts`)의 분기/상태 로직 → 컴포넌트는 스냅샷 대신 사용자 행동 기준으로 선택적으로. E2E(Playwright)는 아직 미도입 — 훅 단위로 못 잡는 흐름(OAuth 리다이렉트 등)이 생기면 그때 검토.
- localStorage를 쓰는 게스트 관련 테스트는 jsdom이 기본 제공하는 `Storage`를 그대로 쓰고, 실패 경로는 `vi.spyOn(Storage.prototype, 'setItem')`으로 강제 발생시킨다 — 모듈 자체를 mock하지 않고 실제에 가깝게 검증.
