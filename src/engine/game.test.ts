import { describe, expect, it } from "vitest";
import { getTile, makeTile, resetTileIds, setTile } from "./board.ts";
import { Game } from "./game.ts";
import { COLS, ROWS, type Tile } from "./types.ts";

function noMatchGrid() {
  resetTileIds();
  const board: (Tile | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      setTile(board, { r, c }, makeTile((r + 2 * c) % 5));
    }
  }
  return board;
}

describe("Game.trySwap special combo", () => {
  it("resolves special+special even without a color match", () => {
    const game = new Game(1);
    game.board = noMatchGrid();
    setTile(game.board, { r: 3, c: 3 }, makeTile(0, "bomb"));
    setTile(game.board, { r: 3, c: 4 }, makeTile(1, "lightning"));
    const moves = game.moves;
    const out = game.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
    expect(out.bounced).toBe(false);
    expect(game.moves).toBe(moves - 1);
    expect(out.result?.events.some((e) => e.type === "activate")).toBe(true);
  });

  it("still bounces special into a normal tile with no match", () => {
    const game = new Game(1);
    game.board = noMatchGrid();
    setTile(game.board, { r: 3, c: 3 }, makeTile(0, "bomb"));
    const moves = game.moves;
    const neighbor = getTile(game.board, { r: 3, c: 4 });
    expect(neighbor?.special).toBe("none");
    const out = game.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
    expect(out.bounced).toBe(true);
    expect(game.moves).toBe(moves);
    expect(getTile(game.board, { r: 3, c: 3 })?.special).toBe("bomb");
  });
});
