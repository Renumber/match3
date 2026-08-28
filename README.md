# Match3 Roguelite

매치3로 특수 타일을 만들고, 로그라이트 빌드로 연쇄를 키워서, 후반에는 입력 한 번에 보드가 폭주하는 게임.

> 생각은 적게, 결과는 크게.

Candy Crush × Vampire Survivors. Balatro처럼 계산하지 않는다.

현재는 웹에서 한 판 풀 루프를 검증하는 MVP 단계. 구현 코드는 아직 없다.

## 문서

- [docs/mvp.md](docs/mvp.md) — 게임 설계. 잠긴 규칙과 미확정 항목.
- [docs/web.md](docs/web.md) — 웹 테스트 구조, 엔진 분리, 구현 순서.

## 스택 (예정)

Vue 3 · Vite · TypeScript · Tailwind. 게임 로직은 Vue를 모르는 순수 TS 엔진.

## MVP가 답해야 하는 것

1. Match 손맛이 있는가
2. Line / Bomb / Lightning 쾌감이 다른가
3. 특수끼리 붙으면 예상 이상 연쇄인가
4. 레벨업이 즉시 강하게 느껴지는가
5. 후반 입력 한 번의 가치가 압도적인가
6. Bonus Chain이 보상처럼 느껴지는가
