import { COLS, ROWS, inBounds, type Pos, type Special, type Tile } from "./types.ts";
import { getTile } from "./board.ts";
import { pickWeightedIndex, shuffleInPlace, type Rng } from "./rng.ts";

export const THREE_MATCH_SPECIAL_WEIGHTS: { kind: "line" | "bomb" | "lightning"; weight: number }[] =
  [
    { kind: "line", weight: 5 },
    { kind: "bomb", weight: 3 },
    { kind: "lightning", weight: 2 },
  ];

export function uniquePos(cells: Pos[]): Pos[] {
  const seen = new Set<string>();
  const out: Pos[] = [];
  for (const cell of cells) {
    const key = `${cell.r},${cell.c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cell);
  }
  return out;
}

export function spreadIndices(origin: number, extra: number, max: number): number[] {
  const indices = [origin];
  let offset = 1;
  while (indices.length < 1 + extra) {
    const before = indices.length;
    const hi = origin + offset;
    const lo = origin - offset;
    if (hi < max) indices.push(hi);
    if (indices.length >= 1 + extra) break;
    if (lo >= 0) indices.push(lo);
    if (indices.length === before) break;
    offset += 1;
  }
  return indices;
}

export function lineRows(rows: number[]): Pos[] {
  const cells: Pos[] = [];
  for (const r of rows) {
    for (let c = 0; c < COLS; c++) cells.push({ r, c });
  }
  return cells;
}

export function lineCols(cols: number[]): Pos[] {
  const cells: Pos[] = [];
  for (const c of cols) {
    for (let r = 0; r < ROWS; r++) cells.push({ r, c });
  }
  return cells;
}

export function bombCells(origin: Pos, radius: number): Pos[] {
  const cells: Pos[] = [];
  for (let r = origin.r - radius; r <= origin.r + radius; r++) {
    for (let c = origin.c - radius; c <= origin.c + radius; c++) {
      const p = { r, c };
      if (inBounds(p)) cells.push(p);
    }
  }
  return cells;
}

export function squareCorners(origin: Pos, radius: number): Pos[] {
  const r = Math.max(1, radius);
  const rMin = Math.max(0, origin.r - r);
  const rMax = Math.min(ROWS - 1, origin.r + r);
  const cMin = Math.max(0, origin.c - r);
  const cMax = Math.min(COLS - 1, origin.c + r);
  return uniquePos([
    { r: rMin, c: cMin },
    { r: rMin, c: cMax },
    { r: rMax, c: cMin },
    { r: rMax, c: cMax },
  ]);
}

export function pickSquareCorners(origin: Pos, radius: number, count: number, rng: Rng): Pos[] {
  const corners = squareCorners(origin, radius);
  shuffleInPlace(corners, rng);
  return corners.slice(0, Math.max(0, count));
}

export function lightningTargets(
  board: (Tile | null)[][],
  origin: Pos,
  count: number,
  rng: Rng,
): Pos[] {
  const cores: Pos[] = [];
  const specials: Pos[] = [];
  const normals: Pos[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === origin.r && c === origin.c) continue;
      const tile = getTile(board, { r, c });
      if (!tile) continue;
      if (tile.blocker) cores.push({ r, c });
      else if (tile.special !== "none") specials.push({ r, c });
      else normals.push({ r, c });
    }
  }
  shuffleInPlace(cores, rng);
  shuffleInPlace(specials, rng);
  shuffleInPlace(normals, rng);
  return [...cores, ...specials, ...normals].slice(0, count);
}

export function specialFromThreeMatch(cells: Pos[], origin: Pos, rng: Rng): Special {
  const idx = pickWeightedIndex(
    rng,
    THREE_MATCH_SPECIAL_WEIGHTS.map((item) => item.weight),
  );
  const picked = THREE_MATCH_SPECIAL_WEIGHTS[idx]?.kind ?? "line";
  if (picked === "bomb") return "bomb";
  if (picked === "lightning") return "lightning";
  const horizontal = cells.every((cell) => cell.r === origin.r);
  return horizontal ? "lineH" : "lineV";
}
