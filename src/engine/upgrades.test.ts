import { describe, expect, it } from "vitest";
import { applyUpgradeEffect, defaultUpgradeStats, UPGRADE_STAT_DEFS, xpFromClears } from "./upgrades.ts";

describe("applyUpgradeEffect", () => {
  it("builds defaults from the stat schema", () => {
    const stats = defaultUpgradeStats();
    expect(Object.keys(stats).sort()).toEqual(Object.keys(UPGRADE_STAT_DEFS).sort());
    expect(stats.bombRadius).toBe(UPGRADE_STAT_DEFS.bombRadius.default);
    expect(stats.autoDetonate).toBe(false);
  });
  it("stacks numeric bonuses", () => {
    const stats = defaultUpgradeStats();
    applyUpgradeEffect(stats, { extraLines: 1, lightningTargets: 2 });
    applyUpgradeEffect(stats, { bombRadius: 1, specialSpawnChance: 0.25 });
    expect(stats.bombRadius).toBe(2);
    applyUpgradeEffect(stats, { bombRadius: 1 });
    expect(stats.bombRadius).toBe(3);
    expect(stats.extraLines).toBe(1);
    expect(stats.lightningTargets).toBe(4);
    expect(stats.specialSpawnChance).toBeCloseTo(0.25);
  });

  it("turns on unique flags", () => {
    const stats = defaultUpgradeStats();
    applyUpgradeEffect(stats, { autoDetonate: true, chainMoveThreshold: 15, chainMoveBonus: 1 });
    expect(stats.autoDetonate).toBe(true);
    expect(stats.chainMoveThreshold).toBe(15);
    expect(stats.chainMoveBonus).toBe(1);
  });

  it("stacks economy bonuses and caps xp", () => {
    const stats = defaultUpgradeStats();
    applyUpgradeEffect(stats, { moveOnSpecial: 1, movesOnLevel: 2, xpBonus: 0.25 });
    applyUpgradeEffect(stats, { moveOnSpecial: 1, movesOnLevel: 2, xpBonus: 0.25 });
    applyUpgradeEffect(stats, { xpBonus: 1 });
    expect(stats.moveOnSpecial).toBe(2);
    expect(stats.movesOnLevel).toBe(4);
    expect(stats.xpBonus).toBe(1);
  });

  it("turns on cross shapes", () => {
    const stats = defaultUpgradeStats();
    applyUpgradeEffect(stats, { crossLine: true, bombCross: true });
    expect(stats.crossLine).toBe(true);
    expect(stats.bombCross).toBe(true);
  });

  it("caps leftover special counts", () => {
    const stats = defaultUpgradeStats();
    applyUpgradeEffect(stats, { bombEcho: 1, lightningEcho: 1, lineEcho: 1 });
    applyUpgradeEffect(stats, { bombEcho: 1, lightningEcho: 1, lineEcho: 1 });
    applyUpgradeEffect(stats, { bombEcho: 4, lightningSeedBomb: true, lineEcho: 2 });
    expect(stats.bombEcho).toBe(4);
    expect(stats.lightningEcho).toBe(2);
    expect(stats.lineEcho).toBe(2);
    expect(stats.lightningSeedBomb).toBe(true);
  });

  it("scales xp from clears", () => {
    const stats = defaultUpgradeStats();
    expect(xpFromClears(3, stats)).toBe(3);
    stats.xpBonus = 0.25;
    expect(xpFromClears(3, stats)).toBe(4);
    stats.xpBonus = 1;
    expect(xpFromClears(3, stats)).toBe(6);
  });
});
