import { createFilledBoard, getTile, swapTiles } from "./board.ts";
import { hasMatch } from "./match.ts";
import { mulberry32, type Rng } from "./rng.ts";
import { resolveBoard } from "./resolve.ts";
import { isAdjacent, type Pos, type Tile } from "./types.ts";
import type { ResolveResult } from "./events.ts";

export type SwapOutcome = {
  bounced: boolean;
  result: ResolveResult | null;
};

function createStableBoard(rng: Rng): (Tile | null)[][] {
  for (let i = 0; i < 48; i++) {
    const board = createFilledBoard(rng);
    if (!hasMatch(board)) return board;
  }
  const board = createFilledBoard(rng);
  resolveBoard(board, rng);
  return board;
}

export class Game {
  board: (Tile | null)[][];
  rng: Rng;
  lastChain = 0;
  totalCleared = 0;

  constructor(seed = 1) {
    this.rng = mulberry32(seed);
    this.board = createStableBoard(this.rng);
  }

  trySwap(a: Pos, b: Pos): SwapOutcome {
    if (!isAdjacent(a, b)) return { bounced: true, result: null };
    if (!getTile(this.board, a) || !getTile(this.board, b)) {
      return { bounced: true, result: null };
    }

    swapTiles(this.board, a, b);
    if (!hasMatch(this.board)) {
      swapTiles(this.board, a, b);
      return { bounced: true, result: null };
    }

    const result = resolveBoard(this.board, this.rng, b);
    this.lastChain = result.chain;
    this.totalCleared += result.cleared;
    return { bounced: false, result };
  }
}
