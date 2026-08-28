import { describe, expect, it } from "vitest";
import { applyUpgradeEffect, defaultUpgradeStats } from "./upgrades.ts";

describe("applyUpgradeEffect", () => {
  it("stacks numeric bonuses", () => {
    const stats = defaultUpgradeStats();
    applyUpgradeEffect(stats, { bombRadius: 1, extraLines: 1, lightningTargets: 2 });
    applyUpgradeEffect(stats, { bombRadius: 1, specialSpawnChance: 0.25 });
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
});
