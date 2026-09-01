import { describe, expect, it } from "vitest";
import {
  addXp,
  applyBossHit,
  createRun,
  STAGE1_BOSS_ARMOR,
  STAGE1_BOSS_HP,
  STARTING_MOVES,
  xpForNextLevel,
} from "./run.ts";

describe("run xp", () => {
  it("starts with the raised move count", () => {
    expect(createRun().moves).toBe(STARTING_MOVES);
    expect(STARTING_MOVES).toBe(40);
  });
  it("levels up when xp fills the bar", () => {
    const run = createRun();
    expect(run.level).toBe(1);
    expect(run.xpToNext).toBe(xpForNextLevel(1));
    addXp(run, run.xpToNext);
    expect(run.level).toBe(2);
    expect(run.xp).toBe(0);
    expect(run.pendingLevelUps).toBe(1);
  });

  it("queues multiple level-ups from one grant", () => {
    const run = createRun();
    const first = xpForNextLevel(1);
    const second = xpForNextLevel(2);
    addXp(run, first + second + 3);
    expect(run.level).toBe(3);
    expect(run.xp).toBe(3);
    expect(run.pendingLevelUps).toBe(2);
  });

  it("ignores non-positive xp", () => {
    const run = createRun();
    addXp(run, 0);
    addXp(run, -4);
    expect(run.level).toBe(1);
    expect(run.xp).toBe(0);
  });
});

describe("run boss", () => {
  it("starts at stage 1 hp and armor", () => {
    const run = createRun();
    expect(run.bossHp).toBe(STAGE1_BOSS_HP);
    expect(run.bossMaxHp).toBe(STAGE1_BOSS_HP);
    expect(run.bossArmor).toBe(STAGE1_BOSS_ARMOR);
    expect(run.bossName).toBe("골렘");
  });

  it("subtracts remaining armor from cleared tiles", () => {
    const run = createRun();
    run.bossArmor = 4;
    expect(applyBossHit(run, 12, 0)).toBe(8);
    expect(run.bossHp).toBe(STAGE1_BOSS_HP - 8);
    expect(run.bossArmor).toBe(4);
  });

  it("cracks armor from special activates before absorbing", () => {
    const run = createRun();
    run.bossArmor = 4;
    expect(applyBossHit(run, 12, 3)).toBe(11);
    expect(run.bossArmor).toBe(1);
    expect(run.bossHp).toBe(STAGE1_BOSS_HP - 11);
  });

  it("blocks a hit that does not beat armor", () => {
    const run = createRun();
    run.bossArmor = 8;
    expect(applyBossHit(run, 3, 0)).toBe(0);
    expect(run.bossHp).toBe(STAGE1_BOSS_HP);
    expect(run.bossArmor).toBe(8);
  });

  it("clamps overkill to remaining hp", () => {
    const run = createRun();
    run.bossHp = 4;
    run.bossArmor = 0;
    expect(applyBossHit(run, 10, 0)).toBe(4);
    expect(run.bossHp).toBe(0);
    expect(applyBossHit(run, 3, 0)).toBe(0);
  });
});
