import { BOMB_RADIUS, COLS, LIGHTNING_BASE_TARGETS, ROWS, inBounds, type Pos, type Special, type Tile } from "./types.ts";
import { getTile } from "./board.ts";
import { shuffleInPlace, type Rng } from "./rng.ts";

export function cellsForSpecial(
  special: Special,
  origin: Pos,
  board: (Tile | null)[][],
  rng: Rng,
): Pos[] {
  if (special === "lineH") return lineRow(origin.r);
  if (special === "lineV") return lineCol(origin.c);
  if (special === "bomb") return bombCells(origin);
  if (special === "lightning") return lightningTargets(board, origin, LIGHTNING_BASE_TARGETS, rng);
  return [];
}

function lineRow(r: number): Pos[] {
  const cells: Pos[] = [];
  for (let c = 0; c < COLS; c++) cells.push({ r, c });
  return cells;
}

function lineCol(c: number): Pos[] {
  const cells: Pos[] = [];
  for (let r = 0; r < ROWS; r++) cells.push({ r, c });
  return cells;
}

function bombCells(origin: Pos): Pos[] {
  const cells: Pos[] = [];
  for (let r = origin.r - BOMB_RADIUS; r <= origin.r + BOMB_RADIUS; r++) {
    for (let c = origin.c - BOMB_RADIUS; c <= origin.c + BOMB_RADIUS; c++) {
      const p = { r, c };
      if (inBounds(p)) cells.push(p);
    }
  }
  return cells;
}

function lightningTargets(board: (Tile | null)[][], origin: Pos, count: number, rng: Rng): Pos[] {
  const specials: Pos[] = [];
  const normals: Pos[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === origin.r && c === origin.c) continue;
      const tile = getTile(board, { r, c });
      if (!tile) continue;
      if (tile.special !== "none") specials.push({ r, c });
      else normals.push({ r, c });
    }
  }
  shuffleInPlace(specials, rng);
  shuffleInPlace(normals, rng);
  return [...specials, ...normals].slice(0, count);
}
