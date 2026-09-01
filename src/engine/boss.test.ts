import { describe, expect, it } from "vitest";
import { STAGE1_BOSS, type BossDef } from "../data/bosses.ts";
import { createFilledBoard, getTile } from "./board.ts";
import { applyBossHit, placeBossTiles } from "./boss.ts";
import { createRun } from "./run.ts";
import { mulberry32 } from "./rng.ts";

const BARE: BossDef = { id: "bare", name: "맨몸", hp: 80, gimmicks: [] };

describe("boss catalog", () => {
  it("places golem cores from the def, not from game", () => {
    const board = createFilledBoard(mulberry32(1));
    placeBossTiles(board, STAGE1_BOSS);
    expect(getTile(board, { r: 3, c: 3 })?.blocker).toBe(true);
    expect(getTile(board, { r: 4, c: 4 })?.blocker).toBe(true);
  });

  it("skips cores when the boss has none", () => {
    const board = createFilledBoard(mulberry32(1));
    placeBossTiles(board, BARE);
    expect(getTile(board, { r: 3, c: 3 })?.blocker).toBeFalsy();
  });

  it("deals full clears when armor gimmick is absent", () => {
    const run = createRun(BARE);
    expect(run.bossArmorMax).toBe(0);
    expect(applyBossHit(run, { cleared: 12, activates: 4 })).toBe(12);
    expect(run.bossHp).toBe(68);
    expect(run.bossArmor).toBe(0);
  });

  it("cracks armor from cores separately from activates", () => {
    const run = createRun();
    run.bossArmor = 4;
    expect(applyBossHit(run, { cleared: 10, activates: 1, blockersCleared: 2 })).toBe(9);
    expect(run.bossArmor).toBe(1);
  });
});
