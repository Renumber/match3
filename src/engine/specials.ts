import { COLS, ROWS, inBounds, type Pos, type Special, type Tile } from "./types.ts";
import { getTile } from "./board.ts";
import { pickWeightedIndex, shuffleInPlace, type Rng } from "./rng.ts";
import { defaultUpgradeStats, type UpgradeStats } from "./upgrades.ts";

export const THREE_MATCH_SPECIAL_WEIGHTS: { kind: "line" | "bomb" | "lightning"; weight: number }[] =
  [
    { kind: "line", weight: 5 },
    { kind: "bomb", weight: 3 },
    { kind: "lightning", weight: 2 },
  ];

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

export function cellsForSpecial(
  special: Special,
  origin: Pos,
  board: (Tile | null)[][],
  rng: Rng,
  stats: UpgradeStats = defaultUpgradeStats(),
): Pos[] {
  if (special === "lineH") return lineRows(spreadIndices(origin.r, stats.extraLines, ROWS));
  if (special === "lineV") return lineCols(spreadIndices(origin.c, stats.extraLines, COLS));
  if (special === "bomb") return bombCells(origin, stats.bombRadius);
  if (special === "lightning") return lightningTargets(board, origin, stats.lightningTargets, rng);
  return [];
}

function lineRows(rows: number[]): Pos[] {
  const cells: Pos[] = [];
  for (const r of rows) {
    for (let c = 0; c < COLS; c++) cells.push({ r, c });
  }
  return cells;
}

function lineCols(cols: number[]): Pos[] {
  const cells: Pos[] = [];
  for (const c of cols) {
    for (let r = 0; r < ROWS; r++) cells.push({ r, c });
  }
  return cells;
}

function bombCells(origin: Pos, radius: number): Pos[] {
  const cells: Pos[] = [];
  for (let r = origin.r - radius; r <= origin.r + radius; r++) {
    for (let c = origin.c - radius; c <= origin.c + radius; c++) {
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
