import { COLS, ROWS, type Tile } from "./types.ts";
import { fillEmpty, getTile, setTile } from "./board.ts";
import type { Rng } from "./rng.ts";
import type { DropIn, FallMove } from "./events.ts";

export function applyGravity(board: (Tile | null)[][]): FallMove[] {
  const moves: FallMove[] = [];
  for (let c = 0; c < COLS; c++) {
    const pieces: { tile: Tile; fromR: number }[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const tile = getTile(board, { r, c });
      if (tile) pieces.push({ tile, fromR: r });
    }
    for (let r = 0; r < ROWS; r++) setTile(board, { r, c }, null);
    let dest = ROWS - 1;
    for (const piece of pieces) {
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
