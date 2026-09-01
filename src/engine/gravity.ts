import { COLS, ROWS, type Tile } from "./types.ts";
import { fillEmpty, getTile, setTile } from "./board.ts";
import type { Rng } from "./rng.ts";
import type { DropIn, FallMove } from "./events.ts";

export function applyGravity(board: (Tile | null)[][]): FallMove[] {
  const moves: FallMove[] = [];
  for (let c = 0; c < COLS; c++) {
    const gems: { tile: Tile; fromR: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      const tile = getTile(board, { r, c });
      if (tile && !tile.blocker) gems.push({ tile, fromR: r });
    }

    for (let r = 0; r < ROWS; r++) {
      const tile = getTile(board, { r, c });
      if (tile?.blocker) continue;
      setTile(board, { r, c }, null);
    }

    const dests: number[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!getTile(board, { r, c })?.blocker) dests.push(r);
    }

    let gi = gems.length - 1;
    for (const dest of dests) {
      if (gi < 0) break;
      const piece = gems[gi];
      gi -= 1;
      if (!piece) break;
      setTile(board, { r: dest, c }, piece.tile);
      if (piece.fromR !== dest) {
        moves.push({
          id: piece.tile.id,
          from: { r: piece.fromR, c },
          to: { r: dest, c },
        });
      }
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
