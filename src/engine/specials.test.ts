import { describe, expect, it } from "vitest";
import { emptyBoard, makeTile, resetTileIds, setTile } from "./board.ts";
import { mulberry32 } from "./rng.ts";
import { cellsForSpecial } from "./specials.ts";
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
});
