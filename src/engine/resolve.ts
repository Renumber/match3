import {
  type MatchKind,
  type Pos,
  type Special,
  type Tile,
  inBounds,
  posKey,
  specialFromMatch,
} from "./types.ts";
import { getTile, makeTile, setTile } from "./board.ts";
import { findMatches } from "./match.ts";
import { settleBoard } from "./gravity.ts";
import { cellsForSpecial, specialActivateFx } from "./specials.ts";
import type { GameEvent, ResolveResult } from "./events.ts";
import type { Rng } from "./rng.ts";
import { collectEchoBursts, shouldAutoDetonate, spawnFromThreeMatch } from "./upgradeRules.ts";
import { defaultUpgradeStats, type UpgradeStats } from "./upgradeStats.ts";

const MAX_STEPS = 80;
const MAX_ACTIVATES = 80;

type ActivateJob = {
  at: Pos;
  special: Special;
  plain?: boolean;
  echoDepth?: number;
};

type EchoJob = {
  at: Pos;
  special: Special;
  color: number;
  echoDepth: number;
};

const MAX_ECHO_WAVES = 8;

function addCell(set: Set<string>, cells: Pos[], p: Pos): void {
  const k = posKey(p);
  if (set.has(k)) return;
  set.add(k);
  cells.push(p);
}

function activateSpecials(
  board: (Tile | null)[][],
  rng: Rng,
  queue: ActivateJob[],
  clearSet: Set<string>,
  toClear: Pos[],
  stats: UpgradeStats,
): { fxEvents: GameEvent[]; echoes: EchoJob[] } {
  const fxEvents: GameEvent[] = [];
  const echoes: EchoJob[] = [];
  const seenActivate = new Set<string>();
  let steps = 0;
  while (queue.length && steps < MAX_ACTIVATES) {
    steps += 1;
    const next = queue.shift();
    if (!next) break;
    const ak = `${posKey(next.at)}:${next.special}:${next.plain ? "p" : "u"}`;
    if (seenActivate.has(ak)) continue;
    seenActivate.add(ak);
    const applyStats = next.plain ? defaultUpgradeStats() : stats;
    const echoDepth = next.echoDepth ?? 0;
    fxEvents.push({ type: "activate", at: next.at, special: next.special });
    addCell(clearSet, toClear, next.at);
    fxEvents.push(...specialActivateFx(next.special, next.at, applyStats));
    const struck = cellsForSpecial(next.special, next.at, board, rng, applyStats);
    for (const cell of struck) {
      if (next.special === "lightning") {
        fxEvents.push({ type: "strike", from: next.at, to: cell });
      }
      const tile = getTile(board, cell);
      if (tile && tile.special !== "none" && posKey(cell) !== posKey(next.at)) {
        queue.push({
          at: cell,
          special: tile.special,
          plain: Boolean(tile.plain),
          echoDepth: tile.echoDepth ?? 0,
        });
      }
      addCell(clearSet, toClear, cell);
    }
    const color = getTile(board, next.at)?.color ?? 0;
    for (const burst of collectEchoBursts({
      special: next.special,
      origin: next.at,
      board,
      rng,
      stats,
      struck,
      echoDepth,
    })) {
      echoes.push({ ...burst, color, echoDepth: echoDepth + 1 });
    }
  }
  return { fxEvents, echoes };
}

function plantEchoes(
  board: (Tile | null)[][],
  pending: EchoJob[],
): { events: GameEvent[]; ids: Set<number> } {
  const events: GameEvent[] = [];
  const ids = new Set<number>();
  for (const echo of pending) {
    if (!inBounds(echo.at) || getTile(board, echo.at)) continue;
    const tile = makeTile(echo.color, echo.special, true, echo.echoDepth);
    setTile(board, echo.at, tile);
    events.push({ type: "spawn", at: echo.at, special: echo.special, tile });
    ids.add(tile.id);
  }
  return { events, ids };
}

function jobsForTileIds(board: (Tile | null)[][], ids: Set<number>): ActivateJob[] {
  const jobs: ActivateJob[] = [];
  if (ids.size === 0) return jobs;
  for (let r = 0; r < board.length; r++) {
    const row = board[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const tile = row[c];
      if (!tile || tile.special === "none" || !ids.has(tile.id)) continue;
      jobs.push({
        at: { r, c },
        special: tile.special,
        plain: Boolean(tile.plain),
        echoDepth: tile.echoDepth ?? 0,
      });
    }
  }
  return jobs;
}

function clearActivated(
  board: (Tile | null)[][],
  toClear: Pos[],
): { events: GameEvent[]; cleared: number } {
  const events: GameEvent[] = [];
  const newlyCleared = toClear.filter((cell) => getTile(board, cell));
  if (newlyCleared.length) events.push({ type: "highlight", cells: newlyCleared });
  for (const cell of newlyCleared) setTile(board, cell, null);
  if (newlyCleared.length) events.push({ type: "clear", cells: newlyCleared });
  return { events, cleared: newlyCleared.length };
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
  return spawnFromThreeMatch(cells, origin, rng, stats);
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
    const activateQueue: ActivateJob[] = [];

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
          activateQueue.push({
            at: cell,
            special: tile.special,
            plain: Boolean(tile.plain),
            echoDepth: tile.echoDepth ?? 0,
          });
        }
        addCell(clearSet, toClear, cell);
      }
      if (spawnSpecial !== "none") {
        spawns.push({ at: match.origin, special: spawnSpecial, color: spawnColor });
      }
    }

    const first = activateSpecials(board, rng, activateQueue, clearSet, toClear, stats);
    events.push({ type: "highlight", cells: [...toClear] });
    events.push(...first.fxEvents);

    for (const cell of toClear) setTile(board, cell, null);
    if (toClear.length) {
      events.push({ type: "clear", cells: [...toClear] });
      cleared += toClear.length;
    }

    let echoes = first.echoes;

    for (const spawn of spawns) {
      const tile = makeTile(spawn.color, spawn.special);
      setTile(board, spawn.at, tile);
      events.push({ type: "spawn", at: spawn.at, special: spawn.special, tile });
    }

    if (shouldAutoDetonate(stats) && spawns.length) {
      const extraClear: Pos[] = [];
      const extraSet = new Set<string>();
      const detonateQueue = spawns.map((spawn) => ({ at: spawn.at, special: spawn.special }));
      const second = activateSpecials(board, rng, detonateQueue, extraSet, extraClear, stats);
      const newlyCleared = extraClear.filter((cell) => getTile(board, cell));
      if (newlyCleared.length) {
        events.push({ type: "highlight", cells: newlyCleared });
      }
      events.push(...second.fxEvents);
      for (const cell of newlyCleared) setTile(board, cell, null);
      if (newlyCleared.length) {
        events.push({ type: "clear", cells: newlyCleared });
        cleared += newlyCleared.length;
      }
      echoes = [...echoes, ...second.echoes];
    }

    if (echoes.length) {
      let pending = echoes;
      for (let wave = 0; wave < MAX_ECHO_WAVES && pending.length; wave++) {
        const planted = plantEchoes(board, pending);
        events.push(...planted.events);
        const settled = settleBoard(board, rng);
        if (settled.falls.length) events.push({ type: "fall", moves: settled.falls });
        if (settled.drops.length) events.push({ type: "dropIn", drops: settled.drops });
        pending = [];
        if (!shouldAutoDetonate(stats) || !planted.ids.size) break;
        const echoJobs = jobsForTileIds(board, planted.ids);
        if (!echoJobs.length) break;
        const echoClear: Pos[] = [];
        const echoSet = new Set<string>();
        const boom = activateSpecials(board, rng, echoJobs, echoSet, echoClear, stats);
        events.push(...boom.fxEvents);
        const extra = clearActivated(board, echoClear);
        events.push(...extra.events);
        cleared += extra.cleared;
        const refill = settleBoard(board, rng);
        if (refill.falls.length) events.push({ type: "fall", moves: refill.falls });
        if (refill.drops.length) events.push({ type: "dropIn", drops: refill.drops });
        pending = boom.echoes;
      }
    } else {
      const { falls, drops } = settleBoard(board, rng);
      if (falls.length) events.push({ type: "fall", moves: falls });
      if (drops.length) events.push({ type: "dropIn", drops: drops });
    }
  }

  return { events, cleared, chain };
}
