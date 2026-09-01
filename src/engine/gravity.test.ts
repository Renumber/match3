import { describe, expect, it } from "vitest";
import { boardFromColors, getTile, makeBlocker, resetTileIds, setTile } from "./board.ts";
import { applyGravity } from "./gravity.ts";
import { COLS, ROWS } from "./types.ts";

function grid(lines: string[]) {
  resetTileIds();
  const padded = lines.map((line) => line.padEnd(COLS, "."));
  while (padded.length < ROWS) padded.push(".".repeat(COLS));
  return boardFromColors(padded);
}

describe("applyGravity", () => {
  it("drops tiles to the bottom", () => {
    const board = grid(["0......."]);
    const moves = applyGravity(board);
    expect(getTile(board, { r: 0, c: 0 })).toBeNull();
    expect(getTile(board, { r: ROWS - 1, c: 0 })?.color).toBe(0);
    expect(moves[0]?.to).toEqual({ r: ROWS - 1, c: 0 });
  });

  it("rests gems on a golem core instead of falling through", () => {
    const board = grid(["0.......", "........", "........"]);
    setTile(board, { r: 5, c: 0 }, makeBlocker());
    applyGravity(board);
    expect(getTile(board, { r: 5, c: 0 })?.blocker).toBe(true);
    expect(getTile(board, { r: 4, c: 0 })?.color).toBe(0);
    expect(getTile(board, { r: ROWS - 1, c: 0 })).toBeNull();
  });
});
