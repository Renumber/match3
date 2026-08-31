import { describe, expect, it } from "vitest";
import { emptyBoard } from "./board.ts";
import { mulberry32 } from "./rng.ts";
import {
  collectEchoBursts,
  extraMovesAfterResolve,
  extraMovesOnLevel,
  UPGRADE_RULES,
} from "./upgradeRules.ts";
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

  it("plants leftover bombs on crater corners", () => {
    const stats = defaultUpgradeStats();
    stats.bombEcho = 2;
    const bursts = collectEchoBursts({
      special: "bomb",
      origin: { r: 3, c: 3 },
      board: emptyBoard(),
      rng: mulberry32(1),
      stats,
      struck: [],
    });
    expect(bursts).toHaveLength(2);
    expect(bursts.every((burst) => burst.special === "bomb")).toBe(true);
    expect(
      bursts.every((burst) => Math.abs(burst.at.r - 3) === 1 && Math.abs(burst.at.c - 3) === 1),
    ).toBe(true);
  });

  it("plants leftover lightning on struck cells", () => {
    const stats = defaultUpgradeStats();
    stats.lightningEcho = 1;
    stats.lightningSeedBomb = true;
    const bursts = collectEchoBursts({
      special: "lightning",
      origin: { r: 0, c: 0 },
      board: emptyBoard(),
      rng: mulberry32(1),
      stats,
      struck: [
        { r: 0, c: 0 },
        { r: 2, c: 3 },
        { r: 4, c: 5 },
      ],
    });
    expect(bursts.some((burst) => burst.special === "lightning" && burst.at.r === 2)).toBe(true);
    expect(bursts.some((burst) => burst.special === "bomb" && burst.at.r === 2)).toBe(true);
  });
});
