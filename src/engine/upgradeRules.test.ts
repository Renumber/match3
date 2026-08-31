import { describe, expect, it } from "vitest";
import { extraMovesAfterResolve, extraMovesOnLevel, UPGRADE_RULES } from "./upgradeRules.ts";
import { defaultUpgradeStats } from "./upgradeStats.ts";

describe("upgrade rule registry", () => {
  it("has unique rule ids", () => {
    const ids = UPGRADE_RULES.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("pays chain and special-activate moves from hooks", () => {
    const stats = defaultUpgradeStats();
    stats.chainMoveThreshold = 15;
    stats.chainMoveBonus = 1;
    stats.moveOnSpecial = 1;
    const chainOnly = extraMovesAfterResolve({ events: [], cleared: 0, chain: 15 }, stats);
    expect(chainOnly).toBe(1);
    const both = extraMovesAfterResolve(
      { events: [{ type: "activate", at: { r: 0, c: 0 }, special: "bomb" }], cleared: 4, chain: 15 },
      stats,
    );
    expect(both).toBe(2);
  });

  it("pays moves on level from hooks", () => {
    const stats = defaultUpgradeStats();
    stats.movesOnLevel = 2;
    expect(extraMovesOnLevel(3, stats)).toBe(6);
    expect(extraMovesOnLevel(0, stats)).toBe(0);
  });
});
