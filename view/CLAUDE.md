@AGENTS.md

## 디자인 시스템
UI를 새로 만들거나 스타일을 고칠 땐 항상 [`docs/design-system.md`](../docs/design-system.md)의 컬러/타이포/컴포넌트 토큰을 따를 것. 임의로 색상·폰트·radius 값을 새로 정하지 않는다.

## 레이어 구조
`lib/`(타입+API 클라이언트) → `hooks/`(React Query 비즈니스 로직) → `components/`(프레젠테이션 전용) → `app/page.tsx`(조립).

## Node 버전 관련
`next dev`가 tailwind oxide 네이티브 바이너리를 못 찾으면: Node를 LTS로 전환 후 `rm -rf node_modules package-lock.json && npm install`로 재설치.
