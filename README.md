# Match3 Roguelite

매치3로 특수 타일을 만들고, 로그라이트 빌드로 연쇄를 키워서, 후반에는 입력 한 번에 보드가 폭주하는 게임.

> 생각은 적게, 결과는 크게.

Candy Crush × Vampire Survivors. Balatro처럼 계산하지 않는다.

현재: Match → 특수 → 연쇄 → XP → 3택까지 웹에서 돈다. 보스 / Bonus Chain / Final Burst는 아직.

## 문서

- [docs/progress.md](docs/progress.md) — 지금 있는 것, 개발 로그. 기능 넣으면 여기 갱신.
- [docs/backlog.md](docs/backlog.md) — 남은 일. 한 판 루프를 닫는 순서가 우선.
- [docs/mvp.md](docs/mvp.md) — 게임 설계. 잠긴 규칙과 미확정 항목.
- [docs/web.md](docs/web.md) — 웹 테스트 구조, 엔진 분리, 구현 순서.
- [docs/ship.md](docs/ship.md) — Amplify MVP → Steam / 앱스토어.

## 스택

- **엔진:** 순수 TypeScript. Vue/Pixi를 모름. vitest로 연쇄 검증.
- **보드:** PixiJS v8. Line / Bomb / Lightning 연출. Burst는 아직.
- **HUD:** DOM 오버레이. 레벨업 3택, Moves, 보스 HP.
- **번들:** Vite.

Vue / React / Tailwind / Phaser 안 씀. 보드는 DOM 트리가 아니고, HUD는 프레임워크를 들일 크기가 아니다. Phaser는 게임 루프를 소유해서 커스텀 resolve FSM과 싸운다.

## 스크립트

```bash
npm install
npm test
npm run dev
```

## MVP가 답해야 하는 것

1. Match 손맛이 있는가
2. Line / Bomb / Lightning 쾌감이 다른가
3. 특수끼리 붙으면 예상 이상 연쇄인가
4. 레벨업이 즉시 강하게 느껴지는가
5. 후반 입력 한 번의 가치가 압도적인가
6. Bonus Chain이 보상처럼 느껴지는가
