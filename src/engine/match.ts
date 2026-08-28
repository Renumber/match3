import { COLS, ROWS, type MatchGroup, type Pos, type Tile } from "./types.ts";
import { getTile } from "./board.ts";

type Run = {
  dir: "h" | "v";
  cells: Pos[];
};

function uniqueCells(cells: Pos[]): Pos[] {
  const seen = new Set<string>();
  const out: Pos[] = [];
  for (const cell of cells) {
    const k = `${cell.r},${cell.c}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(cell);
  }
  return out;
}

function contains(cells: Pos[], p: Pos): boolean {
  return cells.some((c) => c.r === p.r && c.c === p.c);
}

function pickOrigin(cells: Pos[], lastMoved?: Pos): Pos {
  if (lastMoved && contains(cells, lastMoved)) return lastMoved;
  return cells[Math.floor(cells.length / 2)] as Pos;
}

function claimedSet(groups: MatchGroup[]): Set<string> {
  const set = new Set<string>();
  for (const group of groups) {
    for (const cell of group.cells) set.add(`${cell.r},${cell.c}`);
  }
  return set;
}

function unclaimedSegments(run: Run, claimed: Set<string>): Pos[][] {
  const segs: Pos[][] = [];
  let cur: Pos[] = [];
  for (const cell of run.cells) {
    if (claimed.has(`${cell.r},${cell.c}`)) {
      if (cur.length) segs.push(cur);
      cur = [];
      continue;
    }
    cur.push(cell);
  }
  if (cur.length) segs.push(cur);
  return segs;
}

function collectRuns(board: (Tile | null)[][]): Run[] {
  const runs: Run[] = [];

  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const start = getTile(board, { r, c });
      if (!start) {
        c += 1;
        continue;
      }
      let c2 = c + 1;
      while (c2 < COLS) {
        const tile = getTile(board, { r, c: c2 });
        if (!tile || tile.color !== start.color) break;
        c2 += 1;
      }
      if (c2 - c >= 3) {
        const cells: Pos[] = [];
        for (let x = c; x < c2; x++) cells.push({ r, c: x });
        runs.push({ dir: "h", cells });
      }
      c = c2;
    }
  }

  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const start = getTile(board, { r, c });
      if (!start) {
        r += 1;
        continue;
      }
      let r2 = r + 1;
      while (r2 < ROWS) {
        const tile = getTile(board, { r: r2, c });
        if (!tile || tile.color !== start.color) break;
        r2 += 1;
      }
      if (r2 - r >= 3) {
        const cells: Pos[] = [];
        for (let y = r; y < r2; y++) cells.push({ r: y, c });
        runs.push({ dir: "v", cells });
      }
      r = r2;
    }
  }

  return runs;
}

function mergeOverlapping(groups: MatchGroup[]): MatchGroup[] {
  const out: MatchGroup[] = [];
  const used = new Array(groups.length).fill(false);

  for (let i = 0; i < groups.length; i++) {
    if (used[i]) continue;
    const seed = groups[i];
    if (!seed) continue;
    let cells = [...seed.cells];
    let origin = seed.origin;
    used[i] = true;
    let merged = true;
    while (merged) {
      merged = false;
      const keys = new Set(cells.map((p) => `${p.r},${p.c}`));
      for (let j = i + 1; j < groups.length; j++) {
        if (used[j]) continue;
        const other = groups[j];
        if (!other) continue;
        const overlap = other.cells.some((p) => keys.has(`${p.r},${p.c}`));
        if (!overlap) continue;
        cells = uniqueCells([...cells, ...other.cells]);
        used[j] = true;
        merged = true;
      }
    }
    out.push({ kind: "bomb", cells, origin });
  }
  return out;
}

export function findMatches(board: (Tile | null)[][], lastMoved?: Pos): MatchGroup[] {
  const runs = collectRuns(board);
  const hRuns = runs.filter((run) => run.dir === "h");
  const vRuns = runs.filter((run) => run.dir === "v");

  const bombsRaw: MatchGroup[] = [];
  for (const h of hRuns) {
    for (const v of vRuns) {
      const hit = h.cells.filter((p) => contains(v.cells, p));
      if (hit.length === 0) continue;
      const cells = uniqueCells([...h.cells, ...v.cells]);
      bombsRaw.push({
        kind: "bomb",
        cells,
        origin: pickOrigin(cells, lastMoved),
      });
    }
  }
  const bombs = mergeOverlapping(bombsRaw);
  const groups: MatchGroup[] = [...bombs];
  let claimed = claimedSet(groups);

  for (const run of runs) {
    for (const seg of unclaimedSegments(run, claimed)) {
      if (seg.length < 4) continue;
      groups.push({
        kind: run.dir === "h" ? "lineH" : "lineV",
        cells: seg,
        origin: pickOrigin(seg, lastMoved),
      });
    }
  }
  claimed = claimedSet(groups);

  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const a = getTile(board, { r, c });
      const b = getTile(board, { r, c: c + 1 });
      const d = getTile(board, { r: r + 1, c });
      const e = getTile(board, { r: r + 1, c: c + 1 });
      if (!a || !b || !d || !e) continue;
      if (a.color !== b.color || a.color !== d.color || a.color !== e.color) continue;
      const cells: Pos[] = [
        { r, c },
        { r, c: c + 1 },
        { r: r + 1, c },
        { r: r + 1, c: c + 1 },
      ];
      if (cells.some((p) => claimed.has(`${p.r},${p.c}`))) continue;
      groups.push({
        kind: "lightning",
        cells,
        origin: pickOrigin(cells, lastMoved),
      });
      for (const p of cells) claimed.add(`${p.r},${p.c}`);
    }
  }
  claimed = claimedSet(groups);

  for (const run of runs) {
    for (const seg of unclaimedSegments(run, claimed)) {
      if (seg.length < 3) continue;
      groups.push({
        kind: "three",
        cells: seg,
        origin: pickOrigin(seg, lastMoved),
      });
    }
  }

  return groups;
}

export function hasMatch(board: (Tile | null)[][]): boolean {
  return findMatches(board).length > 0;
}
