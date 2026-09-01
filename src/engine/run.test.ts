import { describe, expect, it } from "vitest";
import {
  addXp,
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
  it("starts at stage 1 hp and plate hits", () => {
    const run = createRun();
    expect(run.bossHp).toBe(STAGE1_BOSS_HP);
    expect(run.bossMaxHp).toBe(STAGE1_BOSS_HP);
    expect(run.bossArmor).toBe(STAGE1_BOSS_ARMOR);
    expect(run.bossName).toBe("골렘");
  });
});
