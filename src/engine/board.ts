import {
  COLOR_COUNT,
  COLS,
  ROWS,
  type ColorId,
  type Pos,
  type Tile,
} from "./types.ts";
import { pickInt, type Rng } from "./rng.ts";

let nextId = 1;

export function resetTileIds(start = 1): void {
  nextId = start;
}

export function makeTile(color: ColorId, special: Tile["special"] = "none"): Tile {
  const id = nextId;
  nextId += 1;
  return { id, color, special };
}

export function emptyBoard(): (Tile | null)[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
}

export function cloneBoard(board: (Tile | null)[][]): (Tile | null)[][] {
  return board.map((row) => row.map((tile) => (tile ? { ...tile } : null)));
}

export function getTile(board: (Tile | null)[][], p: Pos): Tile | null {
  return board[p.r]?.[p.c] ?? null;
}

export function setTile(board: (Tile | null)[][], p: Pos, tile: Tile | null): void {
  const row = board[p.r];
  if (!row) return;
  row[p.c] = tile;
}

export function swapTiles(board: (Tile | null)[][], a: Pos, b: Pos): void {
  const rowA = board[a.r];
  const rowB = board[b.r];
  if (!rowA || !rowB) return;
  const tmp = rowA[a.c] ?? null;
  rowA[a.c] = rowB[b.c] ?? null;
  rowB[b.c] = tmp;
}

export function boardFromColors(rows: string[]): (Tile | null)[][] {
  const board = emptyBoard();
  for (let r = 0; r < ROWS; r++) {
    const line = rows[r] ?? "";
    for (let c = 0; c < COLS; c++) {
      const ch = line[c] ?? ".";
      if (ch === "." || ch === " ") continue;
      const color = Number(ch);
      if (Number.isNaN(color)) continue;
      setTile(board, { r, c }, makeTile(color));
    }
  }
  return board;
}

function colorWouldMatch(board: (Tile | null)[][], p: Pos, color: ColorId): boolean {
  if (p.c >= 2) {
    const a = getTile(board, { r: p.r, c: p.c - 1 });
    const b = getTile(board, { r: p.r, c: p.c - 2 });
    if (a && b && a.color === color && b.color === color) return true;
  }
  if (p.r >= 2) {
    const a = getTile(board, { r: p.r - 1, c: p.c });
    const b = getTile(board, { r: p.r - 2, c: p.c });
    if (a && b && a.color === color && b.color === color) return true;
  }
  return false;
}

export function randomColor(rng: Rng, board: (Tile | null)[][], p: Pos): ColorId {
  const options: ColorId[] = [];
  for (let color = 0; color < COLOR_COUNT; color++) {
    if (!colorWouldMatch(board, p, color)) options.push(color);
  }
  if (options.length === 0) return pickInt(rng, COLOR_COUNT);
  return options[pickInt(rng, options.length)] as ColorId;
}

export function fillEmpty(board: (Tile | null)[][], rng: Rng): void {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (getTile(board, { r, c })) continue;
      setTile(board, { r, c }, makeTile(randomColor(rng, board, { r, c })));
    }
  }
}

export function createFilledBoard(rng: Rng): (Tile | null)[][] {
  resetTileIds();
  const board = emptyBoard();
  fillEmpty(board, rng);
  return board;
}
