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

  it("clamps leftover bombs onto the clipped edge of the board", () => {
    const stats = defaultUpgradeStats();
    stats.bombEcho = 4;
    const bursts = collectEchoBursts({
      special: "bomb",
      origin: { r: 0, c: 3 },
      board: emptyBoard(),
      rng: mulberry32(1),
      stats,
      struck: [],
    });
    const keys = new Set(bursts.map((burst) => `${burst.at.r},${burst.at.c}`));
    expect(bursts).toHaveLength(4);
    expect(keys.has("0,2")).toBe(true);
    expect(keys.has("0,4")).toBe(true);
    expect(keys.has("1,2")).toBe(true);
    expect(keys.has("1,4")).toBe(true);
  });

  it("picks leftover bomb corners at random and covers more with more stacks", () => {
    const stats = defaultUpgradeStats();
    stats.bombEcho = 1;
    const keys = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const bursts = collectEchoBursts({
        special: "bomb",
        origin: { r: 3, c: 3 },
        board: emptyBoard(),
        rng: mulberry32(seed),
        stats,
        struck: [],
      });
      expect(bursts).toHaveLength(1);
      keys.add(`${bursts[0]?.at.r},${bursts[0]?.at.c}`);
    }
    expect(keys.size).toBeGreaterThan(1);

    stats.bombEcho = 4;
    const full = collectEchoBursts({
      special: "bomb",
      origin: { r: 3, c: 3 },
      board: emptyBoard(),
      rng: mulberry32(1),
      stats,
      struck: [],
    });
    expect(full).toHaveLength(4);
  });

  it("plants leftover lines on struck cells", () => {
    const stats = defaultUpgradeStats();
    stats.lineEcho = 2;
    const struck = [
      { r: 2, c: 0 },
      { r: 2, c: 1 },
      { r: 2, c: 2 },
      { r: 2, c: 3 },
      { r: 2, c: 4 },
    ];
    const origin = { r: 2, c: 2 };
    const bursts = collectEchoBursts({
      special: "lineH",
      origin,
      board: emptyBoard(),
      rng: mulberry32(1),
      stats,
      struck,
    });
    const struckKeys = new Set(struck.map((cell) => `${cell.r},${cell.c}`));
    expect(bursts).toHaveLength(2);
    expect(bursts.every((burst) => burst.special === "lineH")).toBe(true);
    expect(bursts.every((burst) => struckKeys.has(`${burst.at.r},${burst.at.c}`))).toBe(true);
    expect(bursts.some((burst) => burst.at.r === origin.r && burst.at.c === origin.c)).toBe(false);
  });

  it("picks leftover line cells at random and covers more with more stacks", () => {
    const stats = defaultUpgradeStats();
    stats.lineEcho = 1;
    const struck = [
      { r: 4, c: 0 },
      { r: 4, c: 1 },
      { r: 4, c: 2 },
      { r: 4, c: 3 },
    ];
    const keys = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const bursts = collectEchoBursts({
        special: "lineV",
        origin: { r: 4, c: 1 },
        board: emptyBoard(),
        rng: mulberry32(seed),
        stats,
        struck,
      });
      expect(bursts).toHaveLength(1);
      expect(bursts[0]?.special).toBe("lineV");
      keys.add(`${bursts[0]?.at.r},${bursts[0]?.at.c}`);
    }
    expect(keys.size).toBeGreaterThan(1);

    stats.lineEcho = 2;
    const more = collectEchoBursts({
      special: "lineV",
      origin: { r: 4, c: 1 },
      board: emptyBoard(),
      rng: mulberry32(1),
      stats,
      struck,
    });
    expect(more).toHaveLength(2);
  });

  it("plants leftover lightning on struck cells", () => {
    const stats = defaultUpgradeStats();
    stats.lightningEcho = 1;
    stats.lightningSeedBomb = true;
    const struckKeys = new Set(["2,3", "4,5"]);
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
    expect(
      bursts.some(
        (burst) => burst.special === "lightning" && struckKeys.has(`${burst.at.r},${burst.at.c}`),
      ),
    ).toBe(true);
    expect(
      bursts.some((burst) => burst.special === "bomb" && struckKeys.has(`${burst.at.r},${burst.at.c}`)),
    ).toBe(true);
  });
});
