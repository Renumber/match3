import { describe, expect, it } from "vitest";
import { boardFromColors, resetTileIds } from "./board.ts";
import { applyGravity } from "./gravity.ts";
import { COLS, ROWS } from "./types.ts";
import { getTile } from "./board.ts";

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
});
