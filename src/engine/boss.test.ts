import { describe, expect, it } from "vitest";
import { plateLateAt, STAGE1_BOSS, type BossDef } from "../data/bosses.ts";
import { createFilledBoard, getTile, makeTile, setTile } from "./board.ts";
import { applyBossHit, placeBossTiles, refillBossTiles, syncBossTiles } from "./boss.ts";
import { mulberry32 } from "./rng.ts";
import { createRun } from "./run.ts";

const BARE: BossDef = { id: "bare", name: "맨몸", hp: 80, gimmicks: [] };

const SOAK: BossDef = {
  id: "soak",
  name: "스펀지",
  hp: 100,
  gimmicks: [{ type: "armor", start: 4, crackOnActivate: 1, crackOnBlocker: 1 }],
};

function plateGimmick() {
  const gimmick = STAGE1_BOSS.gimmicks.find((item) => item.type === "plates");
  if (!gimmick || gimmick.type !== "plates") throw new Error("golem plates missing");
  return gimmick;
}

describe("boss catalog", () => {
  it("places golem plates from the def, not from game", () => {
    const board = createFilledBoard(mulberry32(1));
    placeBossTiles(board, STAGE1_BOSS);
    expect(getTile(board, { r: 3, c: 3 })?.blocker).toBe(true);
    expect(getTile(board, { r: 3, c: 3 })?.hits).toBe(3);
    expect(getTile(board, { r: 4, c: 4 })?.blocker).toBe(true);
  });

  it("reads lateAt from the boss def, not the plate gimmick", () => {
    expect(plateLateAt(STAGE1_BOSS)).toBe(10);
    expect(plateLateAt(BARE)).toBe(0);
  });

  it("skips plates when the boss has none", () => {
    const board = createFilledBoard(mulberry32(1));
    placeBossTiles(board, BARE);
    expect(getTile(board, { r: 3, c: 3 })?.blocker).toBeFalsy();
  });

  it("deals full clears when no plate or soak gimmick is present", () => {
    const run = createRun(BARE);
    expect(run.bossArmorMax).toBe(0);
    expect(applyBossHit(run, { cleared: 12, activates: 4 })).toBe(12);
    expect(run.bossHp).toBe(68);
  });

  it("deals damage only when plates break", () => {
    const run = createRun();
    const damage = plateGimmick().damage;
    expect(applyBossHit(run, { cleared: 20, blockersCleared: 0 })).toBe(0);
    expect(run.bossHp).toBe(STAGE1_BOSS.hp);
    expect(applyBossHit(run, { cleared: 20, blockersCleared: 2 })).toBe(damage * 2);
    expect(run.bossHp).toBe(STAGE1_BOSS.hp - damage * 2);
  });

  it("still soaks clears for an armor-only boss", () => {
    const run = createRun(SOAK);
    run.bossArmor = 4;
    expect(applyBossHit(run, { cleared: 12, activates: 3 })).toBe(11);
    expect(run.bossArmor).toBe(1);
  });

  it("respawns missing plates on a free cell", () => {
    const board = createFilledBoard(mulberry32(7));
    placeBossTiles(board, STAGE1_BOSS);
    const gone = { r: 3, c: 3 };
    setTile(board, gone, makeTile(1));
    refillBossTiles(board, mulberry32(9), STAGE1_BOSS, [gone]);
    expect(getTile(board, gone)?.blocker).toBeFalsy();
    let n = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (getTile(board, { r, c })?.blocker) n += 1;
      }
    }
    expect(n).toBe(4);
  });

  it("dumps remaining hp as enraged plates when late hp is reached", () => {
    const board = createFilledBoard(mulberry32(3));
    placeBossTiles(board, STAGE1_BOSS);
    const run = createRun();
    run.bossHp = 10;
    syncBossTiles(board, mulberry32(4), run, STAGE1_BOSS, []);
    expect(run.bossLate).toBe(true);
    const plates = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const tile = getTile(board, { r, c });
        if (tile?.blocker) plates.push(tile);
      }
    }
    expect(plates).toHaveLength(10);
    expect(plates.every((tile) => tile.enraged)).toBe(true);
  });

  it("does not refill plates after late phase", () => {
    const board = createFilledBoard(mulberry32(5));
    placeBossTiles(board, STAGE1_BOSS);
    const run = createRun();
    run.bossHp = 10;
    syncBossTiles(board, mulberry32(6), run, STAGE1_BOSS, []);
    const gone = { r: 0, c: 0 };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (getTile(board, { r, c })?.blocker) {
          gone.r = r;
          gone.c = c;
        }
      }
    }
    setTile(board, gone, makeTile(1));
    run.bossHp = 9;
    syncBossTiles(board, mulberry32(8), run, STAGE1_BOSS, [gone]);
    let n = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (getTile(board, { r, c })?.blocker) n += 1;
      }
    }
    expect(n).toBe(9);
  });
});
