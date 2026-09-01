import {
  type MatchKind,
  type Pos,
  type Special,
  type Tile,
  inBounds,
  posKey,
  samePos,
  specialFromMatch,
} from "./types.ts";
import { getTile, makeTile, setTile } from "./board.ts";
import { findMatches } from "./match.ts";
import { settleBoard } from "./gravity.ts";
import { bothSpecials, comboRecipe, comboStatsForPair } from "./combo.ts";
import { cellsForSpecial, specialActivateFx } from "./specials.ts";
import type { GameEvent, ResolveResult } from "./events.ts";
import type { Rng } from "./rng.ts";
import { collectEchoBursts, shouldAutoDetonate, spawnFromThreeMatch } from "./upgradeRules.ts";
import { defaultUpgradeStats, type UpgradeStats } from "./upgradeStats.ts";

const MAX_STEPS = 80;
const MAX_ACTIVATES = 80;

export type SwapPair = {
  a: Pos;
  b: Pos;
};

type ActivateJob = {
  at: Pos;
  special: Special;
  plain?: boolean;
  echoDepth?: number;
  statsOverride?: UpgradeStats;
  strikeActivate?: Exclude<Special, "none">;
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
    const applyStats = next.plain
      ? defaultUpgradeStats()
      : (next.statsOverride ?? stats);
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
    if (next.strikeActivate) {
      for (const cell of struck) {
        if (samePos(cell, next.at)) continue;
        if (jobQueuedOrSeen(queue, seenActivate, cell, next.strikeActivate)) continue;
        queue.push({ at: cell, special: next.strikeActivate, plain: true });
      }
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

function countBlockers(board: (Tile | null)[][], cells: Pos[]): number {
  let n = 0;
  for (const cell of cells) {
    if (getTile(board, cell)?.blocker) n += 1;
  }
  return n;
}

function clearActivated(
  board: (Tile | null)[][],
  toClear: Pos[],
): { events: GameEvent[]; cleared: number; blockers: number } {
  const events: GameEvent[] = [];
  const newlyCleared = toClear.filter((cell) => getTile(board, cell));
  const blockers = countBlockers(board, newlyCleared);
  if (newlyCleared.length) events.push({ type: "highlight", cells: newlyCleared });
  for (const cell of newlyCleared) setTile(board, cell, null);
  if (newlyCleared.length) events.push({ type: "clear", cells: newlyCleared });
  return { events, cleared: newlyCleared.length, blockers };
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

function jobQueuedOrSeen(
  queue: ActivateJob[],
  seenActivate: Set<string>,
  at: Pos,
  special: Special,
): boolean {
  if (queue.some((job) => samePos(job.at, at) && job.special === special)) return true;
  const key = posKey(at);
  return seenActivate.has(`${key}:${special}:p`) || seenActivate.has(`${key}:${special}:u`);
}

const ORTHO_DELTAS: Pos[] = [
  { r: -1, c: 0 },
  { r: 0, c: 1 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
];

function orthogonalNeighbors(at: Pos): Pos[] {
  const cells: Pos[] = [];
  for (const delta of ORTHO_DELTAS) {
    const next = { r: at.r + delta.r, c: at.c + delta.c };
    if (inBounds(next)) cells.push(next);
  }
  return cells;
}

function jobFromTile(at: Pos, tile: Tile, extras?: Partial<ActivateJob>): ActivateJob {
  return {
    at,
    special: tile.special,
    plain: Boolean(tile.plain),
    echoDepth: tile.echoDepth ?? 0,
    ...extras,
  };
}

function comboJobsFromTiles(
  a: Pos,
  tileA: Tile,
  b: Pos,
  tileB: Tile,
  stats: UpgradeStats,
): ActivateJob[] {
  const recipe = comboRecipe(tileA.special, tileB.special);
  const comboStats = recipe ? comboStatsForPair(stats, tileA.special, tileB.special) : stats;
  const strikeActivate = recipe?.strikeActivate;
  return [
    {
      ...jobFromTile(a, tileA, { statsOverride: comboStats }),
      strikeActivate: tileA.special === "lightning" ? strikeActivate : undefined,
    },
    {
      ...jobFromTile(b, tileB, { statsOverride: comboStats }),
      strikeActivate: tileB.special === "lightning" ? strikeActivate : undefined,
    },
  ];
}

function comboActivateJobs(
  board: (Tile | null)[][],
  swap: SwapPair | undefined,
  stats: UpgradeStats,
): ActivateJob[] | null {
  if (!swap) return null;
  const tileA = getTile(board, swap.a);
  const tileB = getTile(board, swap.b);
  if (!tileA || !tileB || !bothSpecials(tileA.special, tileB.special)) return null;
  return comboJobsFromTiles(swap.a, tileA, swap.b, tileB, stats);
}

function autoDetonateJobs(
  board: (Tile | null)[][],
  origins: Pos[],
  stats: UpgradeStats,
): ActivateJob[] {
  const pending: Pos[] = [];
  const pendingKeys = new Set<string>();
  for (const at of origins) {
    const tile = getTile(board, at);
    if (!tile || tile.special === "none") continue;
    const key = posKey(at);
    if (pendingKeys.has(key)) continue;
    pendingKeys.add(key);
    pending.push(at);
  }

  const used = new Set<string>();
  const jobs: ActivateJob[] = [];

  function takePartner(at: Pos, preferPending: boolean): Pos | undefined {
    for (const neighbor of orthogonalNeighbors(at)) {
      const key = posKey(neighbor);
      if (used.has(key)) continue;
      const tile = getTile(board, neighbor);
      if (!tile || tile.special === "none") continue;
      if (preferPending && !pendingKeys.has(key)) continue;
      return neighbor;
    }
    return undefined;
  }

  for (const at of pending) {
    if (used.has(posKey(at))) continue;
    const tile = getTile(board, at);
    if (!tile) continue;
    const partner = takePartner(at, true) ?? takePartner(at, false);
    if (partner) {
      const other = getTile(board, partner);
      if (other) {
        jobs.push(...comboJobsFromTiles(at, tile, partner, other, stats));
        used.add(posKey(at));
        used.add(posKey(partner));
        continue;
      }
    }
    jobs.push(jobFromTile(at, tile));
    used.add(posKey(at));
  }
  return jobs;
}

function settleEvents(board: (Tile | null)[][], rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  const { falls, drops } = settleBoard(board, rng);
  if (falls.length) events.push({ type: "fall", moves: falls });
  if (drops.length) events.push({ type: "dropIn", drops: drops });
  return events;
}

export function resolveBoard(
  board: (Tile | null)[][],
  rng: Rng,
  lastMoved?: Pos,
  stats: UpgradeStats = defaultUpgradeStats(),
  swap?: SwapPair,
): ResolveResult {
  const events: GameEvent[] = [];
  let cleared = 0;
  let chain = 0;
  let blockersCleared = 0;

  const comboJobs = comboActivateJobs(board, swap, stats);
  if (comboJobs) {
    chain += 1;
    events.push({ type: "chain", value: chain });
    const toClear: Pos[] = [];
    const clearSet = new Set<string>();
    const first = activateSpecials(board, rng, comboJobs, clearSet, toClear, stats);
    events.push({ type: "highlight", cells: [...toClear] });
    events.push(...first.fxEvents);
    blockersCleared += countBlockers(board, toClear);
    for (const cell of toClear) setTile(board, cell, null);
    if (toClear.length) {
      events.push({ type: "clear", cells: [...toClear] });
      cleared += toClear.length;
    }
    if (first.echoes.length) {
      const planted = plantEchoes(board, first.echoes);
      events.push(...planted.events);
      events.push(...settleEvents(board, rng));
      if (shouldAutoDetonate(stats) && planted.ids.size) {
        const echoJobs = autoDetonateJobs(
          board,
          jobsForTileIds(board, planted.ids).map((job) => job.at),
          stats,
        );
        if (echoJobs.length) {
          const echoClear: Pos[] = [];
          const echoSet = new Set<string>();
          const boom = activateSpecials(board, rng, echoJobs, echoSet, echoClear, stats);
          events.push(...boom.fxEvents);
          const extra = clearActivated(board, echoClear);
          events.push(...extra.events);
          cleared += extra.cleared;
          blockersCleared += extra.blockers;
          events.push(...settleEvents(board, rng));
        }
      }
    } else {
      events.push(...settleEvents(board, rng));
    }
    lastMoved = undefined;
  }

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

    blockersCleared += countBlockers(board, toClear);
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
      const detonateQueue = autoDetonateJobs(
        board,
        spawns.map((spawn) => spawn.at),
        stats,
      );
      const second = activateSpecials(board, rng, detonateQueue, extraSet, extraClear, stats);
      const newlyCleared = extraClear.filter((cell) => getTile(board, cell));
      if (newlyCleared.length) {
        events.push({ type: "highlight", cells: newlyCleared });
      }
      events.push(...second.fxEvents);
      blockersCleared += countBlockers(board, newlyCleared);
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
        const echoJobs = autoDetonateJobs(
          board,
          jobsForTileIds(board, planted.ids).map((job) => job.at),
          stats,
        );
        if (!echoJobs.length) break;
        const echoClear: Pos[] = [];
        const echoSet = new Set<string>();
        const boom = activateSpecials(board, rng, echoJobs, echoSet, echoClear, stats);
        events.push(...boom.fxEvents);
        const extra = clearActivated(board, echoClear);
        events.push(...extra.events);
        cleared += extra.cleared;
        blockersCleared += extra.blockers;
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

  return { events, cleared, chain, blockersCleared };
}
