import { describe, expect, it } from "vitest";
import { emptyBoard, makeBlocker, makeTile, resetTileIds, setTile } from "./board.ts";
import { mulberry32 } from "./rng.ts";
import { cellsForSpecial, specialFromThreeMatch } from "./specials.ts";
import { pickSquareCorners, squareCorners } from "./specialShape.ts";
import { defaultUpgradeStats } from "./upgrades.ts";

describe("cellsForSpecial upgrades", () => {
  it("widens bomb radius", () => {
    const stats = defaultUpgradeStats();
    stats.bombRadius = 2;
    const cells = cellsForSpecial("bomb", { r: 3, c: 3 }, emptyBoard(), mulberry32(1), stats);
    expect(cells).toHaveLength(25);
    expect(cells.some((p) => p.r === 1 && p.c === 1)).toBe(true);
  });

  it("adds an extra line", () => {
    const stats = defaultUpgradeStats();
    stats.extraLines = 1;
    const cells = cellsForSpecial("lineH", { r: 2, c: 0 }, emptyBoard(), mulberry32(1), stats);
    const rows = new Set(cells.map((p) => p.r));
    expect(rows.size).toBe(2);
    expect(rows.has(2)).toBe(true);
  });

  it("increases lightning targets", () => {
    resetTileIds();
    const board = emptyBoard();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        setTile(board, { r, c }, makeTile(0));
      }
    }
    const stats = defaultUpgradeStats();
    stats.lightningTargets = 4;
    const cells = cellsForSpecial(
      "lightning",
      { r: 0, c: 0 },
      board,
      mulberry32(1),
      stats,
    );
    expect(cells).toHaveLength(4);
  });

  it("nicks plates one row away from a horizontal line", () => {
    const board = emptyBoard();
    setTile(board, { r: 3, c: 3 }, makeBlocker(3));
    const cells = cellsForSpecial("lineH", { r: 2, c: 0 }, board, mulberry32(1));
    expect(cells.some((p) => p.r === 3 && p.c === 3)).toBe(true);
  });

  it("aims lightning at specials first, not plates", () => {
    resetTileIds();
    const board = emptyBoard();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        setTile(board, { r, c }, makeTile(0));
      }
    }
    setTile(board, { r: 5, c: 5 }, makeBlocker(3));
    setTile(board, { r: 1, c: 6 }, makeTile(1, "bomb"));
    const cells = cellsForSpecial("lightning", { r: 0, c: 0 }, board, mulberry32(1), {
      ...defaultUpgradeStats(),
      lightningTargets: 1,
    });
    expect(cells).toEqual([{ r: 1, c: 6 }]);
  });

  it("adds a perpendicular line", () => {
    const stats = defaultUpgradeStats();
    stats.crossLine = true;
    const cells = cellsForSpecial("lineH", { r: 2, c: 3 }, emptyBoard(), mulberry32(1), stats);
    const rows = new Set(cells.map((p) => p.r));
    const cols = new Set(cells.map((p) => p.c));
    expect(rows.has(2)).toBe(true);
    expect(cols.has(3)).toBe(true);
    expect(cells).toHaveLength(15);
  });

  it("adds a plus through the bomb", () => {
    const stats = defaultUpgradeStats();
    stats.bombCross = true;
    const cells = cellsForSpecial("bomb", { r: 3, c: 3 }, emptyBoard(), mulberry32(1), stats);
    expect(cells).toHaveLength(19);
    expect(cells.some((p) => p.r === 3 && p.c === 0)).toBe(true);
    expect(cells.some((p) => p.r === 0 && p.c === 3)).toBe(true);
  });
});

describe("specialFromThreeMatch", () => {
  it("follows the match axis when a line is rolled", () => {
    const line = specialFromThreeMatch(
      [
        { r: 1, c: 0 },
        { r: 1, c: 1 },
        { r: 1, c: 2 },
      ],
      { r: 1, c: 1 },
      () => 0,
    );
    expect(line).toBe("lineH");
  });

  it("rolls bomb, lightning, and line across seeds", () => {
    const cells = [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 },
    ];
    const origin = { r: 1, c: 0 };
    const kinds = new Set<string>();
    for (let seed = 0; seed < 80; seed++) {
      kinds.add(specialFromThreeMatch(cells, origin, mulberry32(seed)));
    }
    expect(kinds.has("lineV")).toBe(true);
    expect(kinds.has("bomb")).toBe(true);
    expect(kinds.has("lightning")).toBe(true);
  });
});

describe("squareCorners", () => {
  it("keeps the clipped edge when the blast hangs off the board", () => {
    const keys = (origin: { r: number; c: number }) =>
      new Set(squareCorners(origin, 1).map((cell) => `${cell.r},${cell.c}`));
    expect(keys({ r: 0, c: 3 })).toEqual(new Set(["0,2", "0,4", "1,2", "1,4"]));
    expect(keys({ r: 0, c: 0 })).toEqual(new Set(["0,0", "0,1", "1,0", "1,1"]));
    expect(keys({ r: 3, c: 3 })).toEqual(new Set(["2,2", "2,4", "4,2", "4,4"]));
  });

  it("shuffles which corners are kept", () => {
    const keys = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const picked = pickSquareCorners({ r: 3, c: 3 }, 1, 1, mulberry32(seed));
      expect(picked).toHaveLength(1);
      keys.add(`${picked[0]?.r},${picked[0]?.c}`);
    }
    expect(keys.size).toBeGreaterThan(1);
  });
});
