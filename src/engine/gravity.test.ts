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

  it("drops gems through armor to fill a hole below", () => {
    const board = grid(["0......."]);
    setTile(board, { r: 5, c: 0 }, makeBlocker());
    const moves = applyGravity(board);
    expect(getTile(board, { r: 5, c: 0 })?.blocker).toBe(true);
    expect(getTile(board, { r: 0, c: 0 })).toBeNull();
    expect(getTile(board, { r: 4, c: 0 })).toBeNull();
    expect(getTile(board, { r: ROWS - 1, c: 0 })?.color).toBe(0);
    expect(moves.some((move) => move.from.r === 0 && move.to.r === ROWS - 1)).toBe(true);
  });

  it("packs gems into the lowest free cells, skipping armor", () => {
    const board = grid(["1.......", "2......."]);
    setTile(board, { r: 5, c: 0 }, makeBlocker());
    applyGravity(board);
    expect(getTile(board, { r: 5, c: 0 })?.blocker).toBe(true);
    expect(getTile(board, { r: ROWS - 1, c: 0 })?.color).toBe(2);
    expect(getTile(board, { r: ROWS - 2, c: 0 })?.color).toBe(1);
    expect(getTile(board, { r: 4, c: 0 })).toBeNull();
  });

  it("keeps the same gem when filling a hole under armor", () => {
    const board = grid(["0......."]);
    setTile(board, { r: 5, c: 0 }, makeBlocker());
    const gem = getTile(board, { r: 0, c: 0 });
    applyGravity(board);
    expect(getTile(board, { r: ROWS - 1, c: 0 })?.id).toBe(gem?.id);
  });
});
