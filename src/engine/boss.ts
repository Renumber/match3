import {
  plateLateAt,
  plateLateHits,
  platesGimmick,
  type BossDef,
  type BossGimmick,
  type PlatesGimmick,
} from "../data/bosses.ts";
import { getTile, makeBlocker, setTile } from "./board.ts";
import type { GameEvent, ResolveResult } from "./events.ts";
import { pickInt, type Rng } from "./rng.ts";
import type { RunProgress } from "./run.ts";
import { COLS, ROWS, samePos, type Pos, type Tile } from "./types.ts";

export type BossHitCtx = {
  cleared: number;
  activates?: number;
  blockersCleared?: number;
  lateAt?: number;
};

export function placeBossTiles(board: (Tile | null)[][], def: BossDef): void {
  for (const gimmick of def.gimmicks) {
    if (gimmick.type === "cores" || gimmick.type === "plates") {
      const hits = gimmick.type === "plates" ? gimmick.hits : 1;
      for (const at of gimmick.cells) setTile(board, at, makeBlocker(hits));
    }
  }
}

export function armorHitsOnBoard(board: (Tile | null)[][]): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = getTile(board, { r, c });
      if (tile?.blocker) n += tile.hits ?? 1;
    }
  }
  return n;
}

export function platePositions(board: (Tile | null)[][]): Pos[] {
  const cells: Pos[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (getTile(board, { r, c })?.blocker) cells.push({ r, c });
    }
  }
  return cells;
}

/** True once this resolve has already reached the late threshold. Stop early refill. */
export function lateRefillLocked(run: RunProgress, brokenThisResolve: number, lateAt: number): boolean {
  if (run.bossLate) return true;
  if (lateAt <= 0) return false;
  return run.bossHp - brokenThisResolve <= lateAt;
}

export function refillBossTiles(
  board: (Tile | null)[][],
  rng: Rng,
  def: BossDef,
  avoid: Pos[] = [],
  late = false,
): GameEvent[] {
  if (late) return [];
  const gimmick = platesGimmick(def);
  if (!gimmick) return [];
  return refillPlates(board, rng, gimmick, avoid);
}

export function syncBossTiles(
  board: (Tile | null)[][],
  rng: Rng,
  run: RunProgress,
  def: BossDef,
  destroyed: Pos[] = [],
): GameEvent[] {
  const gimmick = platesGimmick(def);
  if (!gimmick) return [];
  if (run.bossHp <= 0) return [];
  const lateAt = plateLateAt(def);
  if (!run.bossLate && lateAt > 0 && run.bossHp <= lateAt) {
    run.bossLate = true;
    return enterLatePlates(board, rng, gimmick, lateAt);
  }
  if (run.bossLate) return [];
  return refillPlates(board, rng, gimmick, destroyed);
}

export function applyBossHit(run: RunProgress, ctx: BossHitCtx): number {
  if (run.bossHp <= 0) return 0;
  const activates = ctx.activates ?? 0;
  const blockersCleared = ctx.blockersCleared ?? 0;
  let plateDamage = 0;
  let hasPlates = false;
  for (const gimmick of run.bossGimmicks) {
    if (gimmick.type === "plates") {
      hasPlates = true;
      plateDamage += blockersCleared * gimmick.damage;
    }
    applyArmorCrack(run, gimmick, activates, blockersCleared);
  }
  if (hasPlates) {
    const lateAt = ctx.lateAt ?? 0;
    if (!run.bossLate && lateAt > 0 && run.bossHp - plateDamage < lateAt) {
      plateDamage = Math.max(0, run.bossHp - lateAt);
    }
    return takeHp(run, plateDamage);
  }
  const soak = run.bossArmorMax > 0 ? run.bossArmor : 0;
  if (ctx.cleared <= 0) return 0;
  return takeHp(run, Math.max(0, ctx.cleared - soak));
}

export function applyResolveToBoss(run: RunProgress, result: ResolveResult, lateAt = 0): number {
  let activates = 0;
  for (const event of result.events) {
    if (event.type === "activate") activates += 1;
  }
  return applyBossHit(run, {
    cleared: result.cleared,
    activates,
    blockersCleared: result.blockersCleared,
    lateAt,
  });
}

function takeHp(run: RunProgress, raw: number): number {
  if (raw <= 0) return 0;
  const dealt = Math.min(raw, run.bossHp);
  run.bossHp -= dealt;
  return dealt;
}

function applyArmorCrack(
  run: RunProgress,
  gimmick: BossGimmick,
  activates: number,
  blockersCleared: number,
): void {
  if (gimmick.type !== "armor") return;
  const cracks =
    activates * gimmick.crackOnActivate + blockersCleared * gimmick.crackOnBlocker;
  const cracked = Math.min(run.bossArmor, Math.max(0, cracks));
  run.bossArmor -= cracked;
}

function enterLatePlates(
  board: (Tile | null)[][],
  rng: Rng,
  gimmick: PlatesGimmick,
  need: number,
): GameEvent[] {
  const events: GameEvent[] = [];
  const hits = plateLateHits(gimmick);
  for (const at of platePositions(board)) {
    const tile = makeBlocker(hits, true);
    setTile(board, at, tile);
    events.push({ type: "spawn", at, special: "none", tile });
  }
  while (platePositions(board).length < need) {
    const at = pickFreeCell(board, rng, []);
    if (!at) return events;
    const tile = makeBlocker(hits, true);
    setTile(board, at, tile);
    events.push({ type: "spawn", at, special: "none", tile });
  }
  return events;
}

function pickFreeCell(board: (Tile | null)[][], rng: Rng, avoid: Pos[]): Pos | null {
  const spots: Pos[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const at = { r, c };
      if (avoid.some((cell) => samePos(cell, at))) continue;
      const tile = getTile(board, at);
      if (tile && !tile.blocker) spots.push(at);
    }
  }
  if (spots.length === 0) return null;
  return spots[pickInt(rng, spots.length)] ?? null;
}

function refillPlates(
  board: (Tile | null)[][],
  rng: Rng,
  gimmick: PlatesGimmick,
  avoid: Pos[],
): GameEvent[] {
  const events: GameEvent[] = [];
  const need = gimmick.cells.length;
  while (platePositions(board).length < need) {
    const at = pickFreeCell(board, rng, avoid);
    if (!at) break;
    const tile = makeBlocker(gimmick.hits);
    setTile(board, at, tile);
    events.push({ type: "spawn", at, special: "none", tile });
  }
  return events;
}
