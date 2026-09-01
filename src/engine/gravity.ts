import { COLS, ROWS, isBlocker, type Tile } from "./types.ts";
import { fillEmpty, getTile, setTile } from "./board.ts";
import type { Rng } from "./rng.ts";
import type { DropIn, FallMove } from "./events.ts";

export function applyGravity(board: (Tile | null)[][]): FallMove[] {
  const moves: FallMove[] = [];
  for (let c = 0; c < COLS; c++) {
    const original: (Tile | null)[] = [];
    for (let r = 0; r < ROWS; r++) original.push(getTile(board, { r, c }));
    for (let r = 0; r < ROWS; r++) setTile(board, { r, c }, null);

    for (let r = 0; r < ROWS; r++) {
      const tile = original[r];
      if (isBlocker(tile)) setTile(board, { r, c }, tile ?? null);
    }

    let r = ROWS - 1;
    while (r >= 0) {
      if (isBlocker(original[r])) {
        r -= 1;
        continue;
      }
      let pocketTop = r;
      while (pocketTop > 0 && !isBlocker(original[pocketTop - 1])) pocketTop -= 1;
      const movers: { tile: Tile; fromR: number }[] = [];
      for (let rr = r; rr >= pocketTop; rr--) {
        const tile = original[rr];
        if (tile && !tile.blocker) movers.push({ tile, fromR: rr });
      }
      let dest = r;
      for (const piece of movers) {
        setTile(board, { r: dest, c }, piece.tile);
        if (piece.fromR !== dest) {
          moves.push({
            id: piece.tile.id,
            from: { r: piece.fromR, c },
            to: { r: dest, c },
          });
        }
        dest -= 1;
      }
      r = pocketTop - 1;
    }
  }
  return moves;
}

export function settleBoard(
  board: (Tile | null)[][],
  rng: Rng,
): { falls: FallMove[]; drops: DropIn[] } {
  const falls = applyGravity(board);
  const drops = fillEmpty(board, rng);
  return { falls, drops };
}
