import type { BossDef, BossGimmick } from "../data/bosses.ts";
import { makeBlocker, setTile } from "./board.ts";
import type { ResolveResult } from "./events.ts";
import type { RunProgress } from "./run.ts";
import type { Tile } from "./types.ts";

export type BossHitCtx = {
  cleared: number;
  activates?: number;
  blockersCleared?: number;
};

export function placeBossTiles(board: (Tile | null)[][], def: BossDef): void {
  for (const gimmick of def.gimmicks) {
    if (gimmick.type === "cores") {
      for (const at of gimmick.cells) setTile(board, at, makeBlocker());
    }
  }
}

export function applyBossHit(run: RunProgress, ctx: BossHitCtx): number {
  if (run.bossHp <= 0) return 0;
  const activates = ctx.activates ?? 0;
  const blockersCleared = ctx.blockersCleared ?? 0;
  for (const gimmick of run.bossGimmicks) {
    applyGimmickHit(run, gimmick, activates, blockersCleared);
  }
  const soak = run.bossArmorMax > 0 ? run.bossArmor : 0;
  if (ctx.cleared <= 0) return 0;
  const raw = Math.max(0, ctx.cleared - soak);
  const dealt = Math.min(raw, run.bossHp);
  run.bossHp -= dealt;
  return dealt;
}

export function applyResolveToBoss(run: RunProgress, result: ResolveResult): number {
  let activates = 0;
  for (const event of result.events) {
    if (event.type === "activate") activates += 1;
  }
  return applyBossHit(run, {
    cleared: result.cleared,
    activates,
    blockersCleared: result.blockersCleared,
  });
}

function applyGimmickHit(
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
