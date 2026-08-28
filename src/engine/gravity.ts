import { COLS, ROWS, type Tile } from "./types.ts";
import { fillEmpty, getTile } from "./board.ts";
import type { Rng } from "./rng.ts";

export function applyGravity(board: (Tile | null)[][]): void {
  for (let c = 0; c < COLS; c++) {
    const stack: Tile[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const tile = getTile(board, { r, c });
      if (tile) stack.push(tile);
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      const row = board[r];
      if (!row) continue;
      const tile = stack.shift() ?? null;
      row[c] = tile;
    }
  }
}

export function settleBoard(board: (Tile | null)[][], rng: Rng): void {
  applyGravity(board);
  fillEmpty(board, rng);
}
