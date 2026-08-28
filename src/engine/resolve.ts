import {
  COLS,
  ROWS,
  type MatchKind,
  type Pos,
  type Special,
  type Tile,
  posKey,
  specialFromMatch,
} from "./types.ts";
import { getTile, makeTile, setTile } from "./board.ts";
import { findMatches } from "./match.ts";
import { settleBoard } from "./gravity.ts";
import { cellsForSpecial, spreadIndices } from "./specials.ts";
import type { GameEvent, ResolveResult } from "./events.ts";
import type { Rng } from "./rng.ts";
import { defaultUpgradeStats, type UpgradeStats } from "./upgrades.ts";

const MAX_STEPS = 80;

function addCell(set: Set<string>, cells: Pos[], p: Pos): void {
  const k = posKey(p);
  if (set.has(k)) return;
  set.add(k);
  cells.push(p);
}

function activateSpecials(
  board: (Tile | null)[][],
  rng: Rng,
  queue: { at: Pos; special: Special }[],
  clearSet: Set<string>,
  toClear: Pos[],
  stats: UpgradeStats,
): GameEvent[] {
  const fxEvents: GameEvent[] = [];
  const seenActivate = new Set<string>();
  while (queue.length) {
    const next = queue.shift();
    if (!next) break;
    const ak = `${posKey(next.at)}:${next.special}`;
    if (seenActivate.has(ak)) continue;
    seenActivate.add(ak);
    fxEvents.push({ type: "activate", at: next.at, special: next.special });
    if (next.special === "lineH") {
      for (const index of spreadIndices(next.at.r, stats.extraLines, ROWS)) {
        fxEvents.push({ type: "fxLine", dir: "h", index });
      }
    }
    if (next.special === "lineV") {
      for (const index of spreadIndices(next.at.c, stats.extraLines, COLS)) {
        fxEvents.push({ type: "fxLine", dir: "v", index });
      }
    }
    if (next.special === "bomb") fxEvents.push({ type: "fxBomb", at: next.at });
    const struck = cellsForSpecial(next.special, next.at, board, rng, stats);
    for (const cell of struck) {
      if (next.special === "lightning") {
        fxEvents.push({ type: "strike", from: next.at, to: cell });
      }
      const tile = getTile(board, cell);
      if (tile && tile.special !== "none" && posKey(cell) !== posKey(next.at)) {
        queue.push({ at: cell, special: tile.special });
      }
      addCell(clearSet, toClear, cell);
    }
  }
  return fxEvents;
}

function spawnSpecialForMatch(
  matchKind: MatchKind,
  cells: Pos[],
  origin: Pos,
  rng: Rng,
  stats: UpgradeStats,
): Special {
  const spawnSpecial = specialFromMatch(matchKind);
  if (spawnSpecial !== "none") return spawnSpecial;
  if (stats.specialSpawnChance <= 0 || rng() >= stats.specialSpawnChance) return "none";
  const horizontal = cells.every((cell) => cell.r === origin.r);
  return horizontal ? "lineH" : "lineV";
}

export function resolveBoard(
  board: (Tile | null)[][],
  rng: Rng,
  lastMoved?: Pos,
  stats: UpgradeStats = defaultUpgradeStats(),
): ResolveResult {
  const events: GameEvent[] = [];
  let cleared = 0;
  let chain = 0;

  for (let step = 0; step < MAX_STEPS; step++) {
    const matches = findMatches(board, lastMoved);
    lastMoved = undefined;
    if (matches.length === 0) break;

    chain += 1;
    events.push({ type: "chain", value: chain });

    const toClear: Pos[] = [];
    const clearSet = new Set<string>();
    const spawns: { at: Pos; special: Special; color: number }[] = [];
    const activateQueue: { at: Pos; special: Special }[] = [];

    for (const match of matches) {
      const spawnSpecial = spawnSpecialForMatch(
        match.kind,
        match.cells,
        match.origin,
        rng,
        stats,
      );
      const originTile = getTile(board, match.origin);
      const spawnColor = originTile?.color ?? 0;
      for (const cell of match.cells) {
        const tile = getTile(board, cell);
        if (tile && tile.special !== "none") {
          activateQueue.push({ at: cell, special: tile.special });
        }
        addCell(clearSet, toClear, cell);
      }
      if (spawnSpecial !== "none") {
        spawns.push({ at: match.origin, special: spawnSpecial, color: spawnColor });
      }
    }

    const fxEvents = activateSpecials(board, rng, activateQueue, clearSet, toClear, stats);
    events.push({ type: "highlight", cells: [...toClear] });
    events.push(...fxEvents);

    for (const cell of toClear) setTile(board, cell, null);
    if (toClear.length) {
      events.push({ type: "clear", cells: [...toClear] });
      cleared += toClear.length;
    }

    for (const spawn of spawns) {
      const tile = makeTile(spawn.color, spawn.special);
      setTile(board, spawn.at, tile);
      events.push({ type: "spawn", at: spawn.at, special: spawn.special, tile });
    }

    if (stats.autoDetonate && spawns.length) {
      const extraClear: Pos[] = [];
      const extraSet = new Set<string>();
      const detonateQueue = spawns.map((spawn) => ({ at: spawn.at, special: spawn.special }));
      const detonateFx = activateSpecials(board, rng, detonateQueue, extraSet, extraClear, stats);
      const newlyCleared = extraClear.filter((cell) => getTile(board, cell));
      if (newlyCleared.length) {
        events.push({ type: "highlight", cells: newlyCleared });
      }
      events.push(...detonateFx);
      for (const cell of newlyCleared) setTile(board, cell, null);
      if (newlyCleared.length) {
        events.push({ type: "clear", cells: newlyCleared });
        cleared += newlyCleared.length;
      }
    }

    const { falls, drops } = settleBoard(board, rng);
    if (falls.length) events.push({ type: "fall", moves: falls });
    if (drops.length) events.push({ type: "dropIn", drops });
  }

  return { events, cleared, chain };
}
