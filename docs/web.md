# 웹 테스트 구조

첫 플레이 가능 목표: **한 판 풀 루프** (Match → 레벨업 → 보스 처치 → Bonus Chain → Final Burst).

내부 구현은 아래 P0 → P4 순서. 한 파일에 전부 섞지 않는다.

---

## 스택

| 층 | 기술 | 이유 |
| --- | --- | --- |
| 엔진 | TypeScript + vitest | 연쇄/콤보/Bonus는 버그 온상. 헤드리스로 먼저 막음 |
| 보드 렌더 | PixiJS v8 | 번개 아크, 직선, 폭발, Burst는 CSS 타일 삭제로 안 나옴 |
| HUD | HTML/CSS 오버레이 | 3택 모달, Moves, HP. 프레임워크 필요 없음 |
| 번들 | Vite | 웹 테스트 속도 |

**안 쓰는 것**

- Vue / React — 보드가 컴포넌트 트리가 아님. HUD만 있으면 과함.
- Tailwind — HUD 몇 장에 유틸 클래스 세트 들일 이유 없음.
- Phaser — 씬/틱/물리를 소유함. 이 게임의 핵심은 커스텀 resolve 큐.
- CSS Grid 보드 — 초반 매치는 됨. 후반 폭주 검증(질문 2, 3, 6)이 죽음.

엔진은 Pixi를 모른다. 렌더러를 나중에 바꿔도 판정은 그대로.

---

## 폴더

```text
src/
  engine/
    types.ts
    rng.ts
    board.ts
    match.ts
    gravity.ts
    specials.ts      Line / Bomb / Lightning 효과. 서로 if 없음
    combo.ts         6종 레시피 데이터
    events.ts
    resolve.ts       매치 → 생성 → 발동 → 중력 루프
    game.ts          trySwap, 스냅샷
    fsm.ts           Idle / Resolving / LevelUp / Bonus / Burst / Win / Lose
    run.ts           Moves, XP, 업글, 보스 HP
    bonus.ts
  render/
    boardView.ts     Pixi. 스냅샷 + 이벤트 재생
    fx.ts            번개, 라인, 폭발
  ui/
    hud.ts           DOM
    levelUp.ts
    bonusOverlay.ts
  main.ts
```

계약: 엔진이 `BoardSnapshot`과 `GameEvent[]`를 준다. Pixi는 재생한다. 입력은 `engine.trySwap(a, b)`만.

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

콤보 6종은 같은 틱의 인접/스왑 쌍을 `combo.ts` 테이블로 증폭한다. 레시피가 없어도 공간 연쇄는 동작한다.

---

## 구현 순서

플레이 가능 마일스톤은 P4까지 한 판.

| 단계 | 내용 | 검증 |
| --- | --- | --- |
| P0 | 헤드리스 엔진. 보드, 매치, 중력, 3특수, 이벤트 큐 | 연쇄가 수학적으로 터지는가 |
| P1 | Pixi 보드, 스왑, 낙하, 3특수 생성/발동. 보스 없음 | 질문 1–3 |
| P2 | Moves, 보스 HP, 데미지 | 런 압력 |
| P3 | XP, 3택, 업글 소수 | 질문 4–5 |
| P4 | Bonus Chain + Final Burst | 질문 6 |

P1 계측: 스왑당 평균 연쇄, 특수 생성(종류별), 특수→특수 발동, 최대 체인.

---

## MVP에서 안 하는 것

계정, 메타 진행, 사운드 패키지, 5스테이지 곡선, 장애물 보스.

---

## 배포

MVP는 Amplify 정적 호스팅. 데스크탑·모바일 브라우저에서 재미 검증.

최종은 Steam (Tauri) + App Store (Capacitor). 엔진은 그대로, 껍질만 바꿈. 상세: [ship.md](ship.md).
