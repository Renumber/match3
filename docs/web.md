# 웹 테스트 구조

첫 플레이 가능 목표: **한 판 풀 루프** (Match → 레벨업 → 보스 처치 → Bonus Chain → Final Burst).

내부 구현은 아래 P0 → P4 순서. 한 파일에 전부 섞지 않는다. 보너스 연출을 고치다 매치 버그가 나면 검증이 불가능하다.

---

## 스택

- Vue 3 + Vite + TypeScript + Tailwind
- 게임 로직: Vue를 모르는 순수 TypeScript
- 뷰: 엔진 스냅샷만 렌더
- Tailwind: `gray-50` 쓰지 않음. `gray-100`

렌더러는 CSS Grid + transition. 이동 / 낙하 / 삭제. 해석은 스텝 큐 + `requestAnimationFrame`이라서 연쇄가 눈에 보인다.

Pixi / Phaser는 Final Burst 연출이 부족할 때 교체한다. 지금 넣으면 핵심 검증이 느려진다.

---

## 왜 엔진을 분리하나

연쇄, 콤보, Bonus는 버그 온상이다. 순수 TS면 헤드리스 테스트로 연쇄 길이를 먼저 확인한다.

렌더러를 나중에 바꿔도 엔진을 안 뜯는다. 특수 타일 확장 요구와 같은 이유다.

---

## 폴더

```text
src/
  engine/
    board.ts        격자, 스왑, 중력, 타일 타입
    match.ts        3 / 4 / T-L / 2x2 탐지
    events.ts       큐. Explosion / LineStrike / LightningStrike / TileCleared
    specials/       Line, Bomb, Lightning. 이벤트 구독 후 Activate()
    combo.ts        6종 레시피 데이터. 타일 코드에 상대 타입 if 없음
    run.ts          Moves, XP, 업글 스택, 보스 HP
    bonus.ts        Energy, Critical Mass, Final Burst
    fsm.ts          Idle / Resolving / LevelUp / Bonus / Burst / Win / Lose
  ui/
    Board.vue
    Tile.vue
    Hud.vue
    LevelUpModal.vue
    BonusOverlay.vue
```

뷰 계약: 엔진이 `BoardSnapshot`을 준다 (`cells`, `moving`, `clearing`, `specials`, `chain`, `moves`, `bossHp`, `energy`, `phase`). Vue는 구독한다. 클릭/스왑은 `engine.trySwap(a, b)`만. 판정은 전부 엔진.

---

## 상태 기계

| 상태 | 입력 | 다음 |
| --- | --- | --- |
| Idle | 인접 스왑 | Resolving 또는 튕김 |
| Resolving | 매치 → 생성 → 발동 → 중력 루프 | Idle / LevelUp / Lose / Bonus |
| LevelUp | 3택 1 | Idle (업글 적용) |
| Bonus | 자동 연쇄 (제안: 입력 없음) | 끊김 종료 또는 Burst |
| Burst | 남은 특수 강제 발동 | Win |
| Lose | Moves 0, 보스 생존 | 결과 |
| Win | 보스 처치 후 Burst까지 끝 | 결과 |

---

## 이벤트 연쇄

타일 타입이 다른 타일을 직접 알면 확장할수록 지옥이다.

Bomb은 Lightning을 모른다. Bomb은 `ExplosionEvent(origin, radius)`만 던진다. 범위 안 `SpecialTile`이 히트를 받고 `Activate()`한다.

- Line → `LineStrike`
- Lightning → 타겟 선정 후 `LightningStrike`
- 새 타일 (Color, Gravity, …)은 구독자만 추가

콤보 6종은 같은 틱의 인접/스왑 쌍을 `combo.ts` 테이블로 증폭한다. 예: Bomb + Line → Explosion 후 extra `LineStrike` N발.

레시피가 없어도 공간 연쇄는 동작한다. 그래서 몰라도 펑, 알면 더 크다.

---

## 구현 순서

플레이 가능 마일스톤은 P4까지 한 판. 각 단계 재미를 확인한 뒤에만 다음을 붙인다. 콘텐츠 양이 목표가 아니다.

| 단계 | 내용 | 검증 |
| --- | --- | --- |
| P0 | 헤드리스 엔진. 보드, 매치, 중력, 3특수, 이벤트 큐. 고정 시드로 연쇄 길이 테스트. UI 없음 | 연쇄가 수학적으로 터지는가 |
| P1 | Vue 보드, 스왑, 낙하, 3특수 생성/발동. 보스 없음 | 질문 1–3 |
| P2 | Moves, 보스 HP, 데미지. 이기거나 짐. 레벨업 없음 | 런 압력 |
| P3 | XP, 3택, Bomb/Line/Lightning 업글 소수 | 질문 4–5 |
| P4 | Bonus Chain + Final Burst. 슬로모 + 체인 숫자 | 질문 6 |

### P1에서 같이 심는 계측

- 한 스왑당 평균 연쇄 길이
- 특수 생성 횟수 (종류별)
- 특수 → 특수 발동 횟수
- 최대 체인

2×2 Lightning이 너무 흔한지 이 숫자로 본다.

---

## MVP에서 안 하는 것

계정, 메타 진행, 사운드 패키지, 파티클 엔진, 5스테이지 곡선, 장애물 보스.

브라우저 한 페이지에서 한 판을 돌리고, [mvp.md](mvp.md)의 여섯 질문에 YES / NO를 적는 것이 목표다.
