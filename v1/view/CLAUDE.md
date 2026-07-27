@AGENTS.md

## 레이어 구조
`lib/`(타입+API 클라이언트) → `hooks/`(React Query 비즈니스 로직) → `components/`(프레젠테이션 전용) → `app/page.tsx`(조립).

## Node 버전 관련
`next dev`가 tailwind oxide 네이티브 바이너리를 못 찾으면: Node를 LTS로 전환 후 `rm -rf node_modules package-lock.json && npm install`로 재설치.
