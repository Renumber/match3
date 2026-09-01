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
    const chainOnly = extraMovesAfterResolve({ events: [], cleared: 0, chain: 15, blockersCleared: 0 }, stats);
    expect(chainOnly).toBe(1);
    const both = extraMovesAfterResolve(
      { events: [{ type: "activate", at: { r: 0, c: 0 }, special: "bomb" }], cleared: 4, chain: 15, blockersCleared: 0 },
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

  it("plants leftover bombs on crater corners when the roll hits", () => {
    const stats = defaultUpgradeStats();
    stats.bombEcho = 2;
    const bursts = collectEchoBursts({
      special: "bomb",
      origin: { r: 3, c: 3 },
      board: emptyBoard(),
      rng: () => 0,
      stats,
      struck: [],
    });
    expect(bursts.length).toBeGreaterThan(0);
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
      rng: () => 0,
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

  it("raises leftover chance with more stacks and lowers it on later waves", () => {
    const stats = defaultUpgradeStats();
    stats.bombEcho = 1;
    const miss = collectEchoBursts({
      special: "bomb",
      origin: { r: 3, c: 3 },
      board: emptyBoard(),
      rng: () => 0.3,
      stats,
      struck: [],
    });
    expect(miss).toHaveLength(0);

    stats.bombEcho = 2;
    const hit = collectEchoBursts({
      special: "bomb",
      origin: { r: 3, c: 3 },
      board: emptyBoard(),
      rng: () => 0.3,
      stats,
      struck: [],
    });
    expect(hit.length).toBeGreaterThan(0);

    stats.bombEcho = 4;
    const faded = collectEchoBursts({
      special: "bomb",
      origin: { r: 3, c: 3 },
      board: emptyBoard(),
      rng: () => 0.3,
      stats,
      struck: [],
      echoDepth: 2,
    });
    expect(faded).toHaveLength(0);

    const firstWave = collectEchoBursts({
      special: "bomb",
      origin: { r: 3, c: 3 },
      board: emptyBoard(),
      rng: () => 0.3,
      stats,
      struck: [],
      echoDepth: 0,
    });
    expect(firstWave).toHaveLength(4);
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
      rng: () => 0,
      stats,
      struck,
    });
    const struckKeys = new Set(struck.map((cell) => `${cell.r},${cell.c}`));
    expect(bursts).toHaveLength(2);
    expect(bursts.every((burst) => burst.special === "lineH" || burst.special === "lineV")).toBe(
      true,
    );
    expect(bursts.every((burst) => struckKeys.has(`${burst.at.r},${burst.at.c}`))).toBe(true);
    expect(bursts.some((burst) => burst.at.r === origin.r && burst.at.c === origin.c)).toBe(false);
  });

  it("picks leftover line cells and directions at random", () => {
    const stats = defaultUpgradeStats();
    stats.lineEcho = 2;
    const struck = [
      { r: 4, c: 0 },
      { r: 4, c: 1 },
      { r: 4, c: 2 },
      { r: 4, c: 3 },
    ];
    const keys = new Set<string>();
    const dirs = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const bursts = collectEchoBursts({
        special: "lineV",
        origin: { r: 4, c: 1 },
        board: emptyBoard(),
        rng: mulberry32(seed),
        stats,
        struck,
      });
      expect(bursts.length).toBeGreaterThan(0);
      expect(bursts.length).toBeLessThanOrEqual(2);
      for (const burst of bursts) {
        expect(burst.special === "lineH" || burst.special === "lineV").toBe(true);
        keys.add(`${burst.at.r},${burst.at.c}`);
        dirs.add(burst.special);
      }
    }
    expect(keys.size).toBeGreaterThan(1);
    expect(dirs.has("lineH")).toBe(true);
    expect(dirs.has("lineV")).toBe(true);
  });

  it("plants leftover lightning on struck cells", () => {
    const stats = defaultUpgradeStats();
    stats.lightningEcho = 2;
    stats.lightningSeedBomb = true;
    const struckKeys = new Set(["2,3", "4,5"]);
    const bursts = collectEchoBursts({
      special: "lightning",
      origin: { r: 0, c: 0 },
      board: emptyBoard(),
      rng: () => 0,
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
