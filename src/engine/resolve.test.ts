import { describe, expect, it } from "vitest";
import { boardFromColors, getTile, makeBlocker, makeTile, resetTileIds, setTile } from "./board.ts";
import { mulberry32 } from "./rng.ts";
import type { ResolveResult } from "./events.ts";
import { resolveBoard } from "./resolve.ts";
import { COLS, ROWS, type Tile } from "./types.ts";
import { defaultUpgradeStats } from "./upgrades.ts";

function grid(lines: string[]) {
  resetTileIds();
  const padded = lines.map((line) => line.padEnd(COLS, "."));
  while (padded.length < ROWS) padded.push(".".repeat(COLS));
  return boardFromColors(padded);
}

describe("resolveBoard", () => {
  it("spawns a line on four-match origin", () => {
    const board = grid(["0000...."]);
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 });
    expect(result.events.some((e) => e.type === "spawn" && e.special === "lineH")).toBe(
      true,
    );
    expect(result.events.some((e) => e.type === "activate")).toBe(false);
  });

  it("spawns a special from a three-match when spawn chance is 100%", () => {
    const board = grid(["000....."]);
    const stats = defaultUpgradeStats();
    stats.specialSpawnChance = 1;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    expect(result.events.some((e) => e.type === "spawn")).toBe(true);
  });

  it("can spawn line, bomb, or lightning from three-matches", () => {
    const stats = defaultUpgradeStats();
    stats.specialSpawnChance = 1;
    const kinds = new Set<string>();
    for (let seed = 0; seed < 120; seed++) {
      const board = grid(["000....."]);
      const result = resolveBoard(board, mulberry32(seed), { r: 0, c: 2 }, stats);
      for (const event of result.events) {
        if (event.type === "spawn") kinds.add(event.special);
      }
    }
    expect(kinds.has("lineH")).toBe(true);
    expect(kinds.has("bomb")).toBe(true);
    expect(kinds.has("lightning")).toBe(true);
  });

  it("auto-detonates a spawned line", () => {
    const board = grid(["0000...."]);
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 }, stats);
    expect(result.events.some((e) => e.type === "spawn" && e.special === "lineH")).toBe(
      true,
    );
    expect(result.events.some((e) => e.type === "activate" && e.special === "lineH")).toBe(
      true,
    );
    expect(
      result.events.some((e) => e.type === "fxLine" && e.dir === "h" && e.index === 0),
    ).toBe(true);
    expect(specialsOn(board)).toEqual([]);
  });

  it("auto-detonates a spawned lightning and consumes it", () => {
    const board = grid(["00......", "00......"]);
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 0 }, stats);
    expect(result.events.some((e) => e.type === "spawn" && e.special === "lightning")).toBe(
      true,
    );
    expect(result.events.some((e) => e.type === "activate" && e.special === "lightning")).toBe(
      true,
    );
    expect(specialsOn(board)).toEqual([]);
  });

  it("auto-detonates three-match specials from spawn chance", () => {
    const board = grid(["000....."]);
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    stats.specialSpawnChance = 1;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    expect(result.events.some((e) => e.type === "spawn")).toBe(true);
    expect(result.events.some((e) => e.type === "activate")).toBe(true);
    expect(specialsOn(board)).toEqual([]);
  });

  it("draws a cross when a line auto-detonates", () => {
    const board = grid(["0000...."]);
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    stats.crossLine = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 }, stats);
    expect(result.events.some((e) => e.type === "fxLine" && e.dir === "h" && e.index === 0)).toBe(
      true,
    );
    expect(result.events.some((e) => e.type === "fxLine" && e.dir === "v" && e.index === 3)).toBe(
      true,
    );
  });

  it("spawns a small leftover bomb that stays on the board", () => {
    const board = grid([
      "00043210",
      "12340123",
      "23401234",
      "34012340",
      "40123401",
      "01234012",
      "12340123",
      "23401234",
    ]);
    setTile(board, { r: 0, c: 1 }, makeTile(0, "bomb"));
    const stats = defaultUpgradeStats();
    stats.bombEcho = 4;
    stats.bombCross = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    const leftoverSpawn = result.events.find(
      (e) => e.type === "spawn" && e.special === "bomb" && e.tile.plain,
    );
    expect(leftoverSpawn).toBeDefined();
    expect(result.events.some((e) => e.type === "activate" && e.special === "bomb")).toBe(true);
    expect(result.events.some((e) => e.type === "fxLine" && e.dir === "h" && e.index === 0)).toBe(
      true,
    );
    expect(leftoverPlain(board, "bomb")).toBe(true);
  });

  it("lets leftover bombs land before auto-detonate", () => {
    const board = grid([
      "00043210",
      "12340123",
      "23401234",
      "34012340",
      "40123401",
      "01234012",
      "12340123",
      "23401234",
    ]);
    setTile(board, { r: 0, c: 1 }, makeTile(0, "bomb"));
    const stats = defaultUpgradeStats();
    stats.bombEcho = 4;
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    const leftoverSpawn = result.events.findIndex(
      (e) => e.type === "spawn" && e.special === "bomb" && e.tile.plain,
    );
    const settleIdx = result.events.findIndex((e) => e.type === "fall" || e.type === "dropIn");
    const leftoverActivate = result.events.findIndex(
      (e, i) => i > leftoverSpawn && e.type === "activate" && e.special === "bomb",
    );
    expect(leftoverSpawn).toBeGreaterThan(-1);
    expect(settleIdx).toBeGreaterThan(-1);
    expect(leftoverSpawn).toBeGreaterThan(settleIdx);
    expect(leftoverActivate).toBeGreaterThan(leftoverSpawn);
  });

  it("lets a line leave another line on the board", () => {
    const board = grid([
      "00043210",
      "12340123",
      "23401234",
      "34012340",
      "40123401",
      "01234012",
      "12340123",
      "23401234",
    ]);
    setTile(board, { r: 0, c: 1 }, makeTile(0, "lineH"));
    const stats = defaultUpgradeStats();
    stats.lineEcho = 2;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    expect(result.events.some((e) => e.type === "activate" && e.special === "lineH")).toBe(true);
    expect(
      result.events.some(
        (e) =>
          e.type === "spawn" &&
          (e.special === "lineH" || e.special === "lineV") &&
          e.tile.plain,
      ),
    ).toBe(true);
    expect(leftoverPlain(board, "lineH") || leftoverPlain(board, "lineV")).toBe(true);
    const leftoverAt = leftoverPlainAt(board);
    expect(leftoverAt?.r).toBe(0);
  });

  it("keeps leftover lines on the cleared row after gravity", () => {
    const board = grid([
      "12340123",
      "23401234",
      "00043210",
      "34012340",
      "40123401",
      "01234012",
      "12340123",
      "23401234",
    ]);
    setTile(board, { r: 2, c: 1 }, makeTile(0, "lineH"));
    const stats = defaultUpgradeStats();
    stats.lineEcho = 2;
    resolveBoard(board, mulberry32(1), { r: 2, c: 2 }, stats);
    const leftoverAt = leftoverPlainAt(board);
    expect(leftoverAt).toBeTruthy();
    expect(leftoverAt?.r).toBe(2);
    expect(leftoverAt?.r).not.toBe(7);
  });

  it("lets lightning leave another lightning on the board", () => {
    const board = grid([
      "000.....",
      "........",
      "1.2.3.4.",
      "........",
      ".1.2.3.4",
      "........",
      "........",
      "........",
    ]);
    setTile(board, { r: 0, c: 1 }, makeTile(0, "lightning"));
    const stats = defaultUpgradeStats();
    stats.lightningEcho = 2;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    const lightningActivates = result.events.filter(
      (e) => e.type === "activate" && e.special === "lightning",
    );
    expect(lightningActivates.length).toBe(1);
    expect(result.events.some((e) => e.type === "spawn" && e.special === "lightning")).toBe(true);
    expect(specialsOn(board).some((item) => item.startsWith("lightning@"))).toBe(true);
    expect(leftoverPlain(board, "lightning")).toBe(true);
  });

  it("fires both specials on a swap combo without a color match", () => {
    const board = noMatchGrid();
    setTile(board, { r: 3, c: 3 }, makeTile(0, "bomb"));
    setTile(board, { r: 3, c: 4 }, makeTile(1, "bomb"));
    const result = resolveBoard(board, mulberry32(1), { r: 3, c: 4 }, defaultUpgradeStats(), {
      a: { r: 3, c: 3 },
      b: { r: 3, c: 4 },
    });
    const bombs = result.events.filter((e) => e.type === "activate" && e.special === "bomb");
    expect(bombs).toHaveLength(2);
    expect(result.chain).toBeGreaterThanOrEqual(1);
    expect(clearedCells(result).some((p) => p.r === 1 && p.c === 1)).toBe(true);
  });

  it("adds extra lines on line+line swap", () => {
    const board = noMatchGrid();
    setTile(board, { r: 2, c: 1 }, makeTile(0, "lineH"));
    setTile(board, { r: 2, c: 2 }, makeTile(1, "lineH"));
    const result = resolveBoard(board, mulberry32(1), { r: 2, c: 2 }, defaultUpgradeStats(), {
      a: { r: 2, c: 1 },
      b: { r: 2, c: 2 },
    });
    const rows = lineIndexes(result.events, "h");
    expect(rows).toContain(2);
    expect(rows.some((index) => index !== 2)).toBe(true);
  });

  it("does not give combo extras to a spatially chained special", () => {
    const board = noMatchGrid();
    setTile(board, { r: 4, c: 4 }, makeTile(0, "bomb"));
    setTile(board, { r: 4, c: 5 }, makeTile(1, "lineH"));
    setTile(board, { r: 3, c: 4 }, makeTile(2, "lineV"));
    const result = resolveBoard(board, mulberry32(1), { r: 4, c: 5 }, defaultUpgradeStats(), {
      a: { r: 4, c: 4 },
      b: { r: 4, c: 5 },
    });
    const vLines = lineIndexes(result.events, "v");
    expect(vLines).toEqual([4]);
  });

  it("adds lightning targets on lightning+lightning swap", () => {
    const board = noMatchGrid();
    setTile(board, { r: 0, c: 0 }, makeTile(0, "lightning"));
    setTile(board, { r: 0, c: 1 }, makeTile(1, "lightning"));
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 1 }, defaultUpgradeStats(), {
      a: { r: 0, c: 0 },
      b: { r: 0, c: 1 },
    });
    const strikes = result.events.filter((e) => e.type === "strike");
    expect(strikes.length).toBeGreaterThanOrEqual(8);
  });

  it("detonates sub-bombs on bomb+lightning strike cells", () => {
    const board = noMatchGrid();
    setTile(board, { r: 3, c: 3 }, makeTile(0, "bomb"));
    setTile(board, { r: 3, c: 4 }, makeTile(1, "lightning"));
    const result = resolveBoard(board, mulberry32(1), { r: 3, c: 4 }, defaultUpgradeStats(), {
      a: { r: 3, c: 3 },
      b: { r: 3, c: 4 },
    });
    const strikes = result.events.filter((e) => e.type === "strike");
    expect(strikes.length).toBeGreaterThanOrEqual(1);
    const bombAt = activateCells(result.events, "bomb");
    for (const strike of strikes) {
      expect(bombAt).toContain(`${strike.to.r},${strike.to.c}`);
    }
  });

  it("fires sub-lines on line+lightning strike cells", () => {
    const board = noMatchGrid();
    setTile(board, { r: 2, c: 2 }, makeTile(0, "lineH"));
    setTile(board, { r: 2, c: 3 }, makeTile(1, "lightning"));
    const result = resolveBoard(board, mulberry32(1), { r: 2, c: 3 }, defaultUpgradeStats(), {
      a: { r: 2, c: 2 },
      b: { r: 2, c: 3 },
    });
    const strikes = result.events.filter((e) => e.type === "strike");
    expect(strikes.length).toBeGreaterThanOrEqual(1);
    const rows = lineIndexes(result.events, "h");
    for (const strike of strikes) {
      expect(rows).toContain(strike.to.r);
    }
  });

  it("combos a spawned line with an adjacent bomb on auto-detonate", () => {
    const board = noMatchGrid();
    for (let c = 0; c < 4; c++) setTile(board, { r: 0, c }, makeTile(0));
    setTile(board, { r: 0, c: 4 }, makeTile(1, "bomb"));
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 }, stats);
    const spawnIdx = result.events.findIndex((e) => e.type === "spawn" && e.special === "lineH");
    expect(spawnIdx).toBeGreaterThan(-1);
    const untilSettle = eventsUntilSettle(result, spawnIdx);
    const rows = lineIndexes(untilSettle, "h");
    expect(rows).toContain(0);
    expect(rows.some((index) => index !== 0)).toBe(true);
    expect(untilSettle.some((e) => e.type === "activate" && e.special === "bomb")).toBe(true);
    expect(untilSettle.some((e) => e.type === "activate" && e.special === "lineH")).toBe(true);
  });

  it("does not combo a spawned line with a diagonal bomb on auto-detonate", () => {
    const board = noMatchGrid();
    for (let c = 0; c < 4; c++) setTile(board, { r: 0, c }, makeTile(0));
    setTile(board, { r: 1, c: 4 }, makeTile(1, "bomb"));
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 }, stats);
    const spawnIdx = result.events.findIndex((e) => e.type === "spawn" && e.special === "lineH");
    const untilSettle = eventsUntilSettle(result, spawnIdx);
    const rows = lineIndexes(untilSettle, "h");
    expect(rows).toEqual([0]);
    expect(untilSettle.some((e) => e.type === "activate" && e.special === "bomb")).toBe(false);
  });

  it("widens adjacent bombs when a bomb auto-detonates", () => {
    const board = noMatchGrid();
    setTile(board, { r: 0, c: 0 }, makeTile(0));
    setTile(board, { r: 1, c: 0 }, makeTile(0));
    setTile(board, { r: 2, c: 0 }, makeTile(0));
    setTile(board, { r: 2, c: 1 }, makeTile(0));
    setTile(board, { r: 2, c: 2 }, makeTile(0));
    setTile(board, { r: 2, c: 3 }, makeTile(1, "bomb"));
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 2, c: 2 }, stats);
    const spawnIdx = result.events.findIndex((e) => e.type === "spawn" && e.special === "bomb");
    expect(spawnIdx).toBeGreaterThan(-1);
    const untilSettle = eventsUntilSettle(result, spawnIdx);
    const highlighted = untilSettle.flatMap((e) => (e.type === "highlight" ? e.cells : []));
    expect(highlighted.some((p) => p.r === 0 && p.c === 4)).toBe(true);
    const bombs = untilSettle.filter((e) => e.type === "activate" && e.special === "bomb");
    expect(bombs.length).toBeGreaterThanOrEqual(2);
  });

  it("fires sub-bombs when lightning auto-detonates next to a bomb", () => {
    const board = noMatchGrid();
    setTile(board, { r: 0, c: 0 }, makeTile(0));
    setTile(board, { r: 0, c: 1 }, makeTile(0));
    setTile(board, { r: 1, c: 0 }, makeTile(0));
    setTile(board, { r: 1, c: 1 }, makeTile(0));
    setTile(board, { r: 0, c: 2 }, makeTile(1, "bomb"));
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 1 }, stats);
    const spawnIdx = result.events.findIndex((e) => e.type === "spawn" && e.special === "lightning");
    const untilSettle = eventsUntilSettle(result, spawnIdx);
    const strikes = untilSettle.filter((e) => e.type === "strike");
    expect(strikes.length).toBeGreaterThanOrEqual(1);
    const bombAt = activateCells(untilSettle, "bomb");
    for (const strike of strikes) {
      expect(bombAt).toContain(`${strike.to.r},${strike.to.c}`);
    }
  });

  it("combos two specials that spawn adjacent on the same tick", () => {
    const board = noMatchGrid();
    for (let c = 0; c < 4; c++) setTile(board, { r: 0, c }, makeTile(0));
    for (let c = 1; c < 5; c++) setTile(board, { r: 1, c }, makeTile(1));
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 }, stats);
    const firstSpawn = result.events.findIndex((e) => e.type === "spawn");
    const untilSettle = eventsUntilSettle(result, firstSpawn);
    const rows = lineIndexes(untilSettle, "h");
    expect(rows).toContain(0);
    expect(rows).toContain(1);
    expect(rows.some((index) => index !== 0 && index !== 1)).toBe(true);
  });

  it("does not combo a spawned special with an adjacent one without auto-detonate", () => {
    const board = noMatchGrid();
    for (let c = 0; c < 4; c++) setTile(board, { r: 0, c }, makeTile(0));
    setTile(board, { r: 0, c: 4 }, makeTile(1, "bomb"));
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 }, defaultUpgradeStats());
    expect(result.events.some((e) => e.type === "spawn" && e.special === "lineH")).toBe(true);
    expect(result.events.some((e) => e.type === "activate")).toBe(false);
    expect(getTile(board, { r: 0, c: 3 })?.special).toBe("lineH");
    expect(getTile(board, { r: 0, c: 4 })?.special).toBe("bomb");
  });

  it("does not seed sub-bombs from a chained lightning", () => {
    const board = noMatchGrid();
    setTile(board, { r: 0, c: 0 }, makeTile(0, "lightning"));
    setTile(board, { r: 0, c: 1 }, makeTile(1, "bomb"));
    setTile(board, { r: 7, c: 7 }, makeTile(2, "lightning"));
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 1 }, defaultUpgradeStats(), {
      a: { r: 0, c: 0 },
      b: { r: 0, c: 1 },
    });
    const lightningActivates = result.events.filter(
      (e) => e.type === "activate" && e.special === "lightning",
    );
    expect(lightningActivates.length).toBe(2);
    const bombActivates = result.events.filter((e) => e.type === "activate" && e.special === "bomb");
    expect(bombActivates).toHaveLength(2);
  });

  it("nicks a plate on the next row when a three-match clears", () => {
    const board = noMatchGrid();
    setTile(board, { r: 0, c: 0 }, makeTile(0));
    setTile(board, { r: 0, c: 1 }, makeTile(0));
    setTile(board, { r: 0, c: 2 }, makeTile(0));
    setTile(board, { r: 1, c: 1 }, makeBlocker(3));
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 1 });
    expect(getTile(board, { r: 1, c: 1 })?.blocker).toBe(true);
    expect(getTile(board, { r: 1, c: 1 })?.hits).toBe(2);
    expect(result.blockersCleared).toBe(0);
    expect(result.events.some((e) => e.type === "crack")).toBe(true);
  });

  it("nicks a plate one row off a line", () => {
    const board = noMatchGrid();
    setTile(board, { r: 2, c: 0 }, makeTile(0, "lineH"));
    setTile(board, { r: 2, c: 1 }, makeTile(0));
    setTile(board, { r: 2, c: 2 }, makeTile(0));
    setTile(board, { r: 3, c: 3 }, makeBlocker(3));
    const result = resolveBoard(board, mulberry32(1), { r: 2, c: 0 });
    expect(getTile(board, { r: 3, c: 3 })?.hits).toBe(2);
    expect(result.blockersCleared).toBe(0);
  });

  it("chips a multi-hit blocker instead of clearing it", () => {
    const board = noMatchGrid();
    setTile(board, { r: 0, c: 0 }, makeTile(0, "lineH"));
    setTile(board, { r: 0, c: 1 }, makeTile(0));
    setTile(board, { r: 0, c: 2 }, makeTile(0));
    setTile(board, { r: 0, c: 5 }, makeBlocker(3));
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 0 });
    expect(getTile(board, { r: 0, c: 5 })?.blocker).toBe(true);
    expect(getTile(board, { r: 0, c: 5 })?.hits).toBe(2);
    expect(result.blockersCleared).toBe(0);
    expect(result.events.some((e) => e.type === "crack")).toBe(true);
  });

  it("clears a blocker on its last hit", () => {
    const board = noMatchGrid();
    setTile(board, { r: 0, c: 0 }, makeTile(0, "lineH"));
    setTile(board, { r: 0, c: 1 }, makeTile(0));
    setTile(board, { r: 0, c: 2 }, makeTile(0));
    setTile(board, { r: 0, c: 5 }, makeBlocker(1));
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 0 });
    expect(getTile(board, { r: 0, c: 5 })?.blocker).toBeFalsy();
    expect(result.blockersCleared).toBe(1);
  });

  it("refills afterClear blockers before leftover specials plant", () => {
    const board = noMatchGrid();
    setTile(board, { r: 2, c: 1 }, makeTile(0));
    setTile(board, { r: 2, c: 2 }, makeTile(0, "bomb"));
    setTile(board, { r: 2, c: 3 }, makeTile(0));
    setTile(board, { r: 3, c: 3 }, makeBlocker(1));
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    stats.bombEcho = 4;
    const refillAt = { r: 4, c: 2 };
    let refilled = false;
    const result = resolveBoard(
      board,
      mulberry32(1),
      { r: 2, c: 2 },
      stats,
      undefined,
      (next, _rng, destroyed) => {
        if (refilled || !destroyed.some((at) => at.r === 3 && at.c === 3)) return [];
        refilled = true;
        const tile = makeBlocker(1);
        setTile(next, refillAt, tile);
        return [{ type: "spawn", at: refillAt, special: "none", tile }];
      },
    );
    const plateSpawn = result.events.findIndex((e) => e.type === "spawn" && e.tile.blocker);
    const leftoverSpawn = result.events.findIndex((e) => e.type === "spawn" && e.tile.plain);
    const settle = result.events.findIndex((e) => e.type === "fall" || e.type === "dropIn");
    expect(refilled).toBe(true);
    expect(plateSpawn).toBeGreaterThan(-1);
    expect(leftoverSpawn).toBeGreaterThan(plateSpawn);
    if (settle >= 0) {
      expect(plateSpawn).toBeLessThan(settle);
      expect(leftoverSpawn).toBeGreaterThan(settle);
    }
    expect(result.blockersCleared).toBe(2);
    expect(getTile(board, refillAt)?.blocker).toBeFalsy();
  });
});

function noMatchGrid() {
  resetTileIds();
  const board = boardFromColors([]);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      setTile(board, { r, c }, makeTile((r + 2 * c) % 5));
    }
  }
  return board;
}

function lineIndexes(events: ResolveResult["events"], dir: "h" | "v"): number[] {
  return events.flatMap((e) => (e.type === "fxLine" && e.dir === dir ? [e.index] : []));
}

function activateCells(events: ResolveResult["events"], special: Tile["special"]): string[] {
  return events.flatMap((e) =>
    e.type === "activate" && e.special === special ? [`${e.at.r},${e.at.c}`] : [],
  );
}

function clearedCells(result: ResolveResult) {
  return result.events.flatMap((e) => (e.type === "clear" ? e.cells : []));
}

function specialsOn(board: (Tile | null)[][]) {
  const found: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = getTile(board, { r, c });
      if (tile && tile.special !== "none") found.push(`${tile.special}@${r},${c}`);
    }
  }
  return found;
}

function eventsUntilSettle(result: ResolveResult, afterIndex = 0) {
  const out: ResolveResult["events"] = [];
  for (let i = afterIndex; i < result.events.length; i++) {
    const event = result.events[i];
    if (!event) break;
    if (event.type === "fall" || event.type === "dropIn") break;
    out.push(event);
  }
  return out;
}

function leftoverPlain(board: (Tile | null)[][], special: Tile["special"]): boolean {
  return leftoverPlainAt(board, special) !== null;
}

function leftoverPlainAt(
  board: (Tile | null)[][],
  special?: Tile["special"],
): { r: number; c: number } | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = getTile(board, { r, c });
      if (!tile?.plain || tile.special === "none") continue;
      if (special && tile.special !== special) continue;
      return { r, c };
    }
  }
  return null;
}
