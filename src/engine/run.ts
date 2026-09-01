import { STAGE1_BOSS, armorStart, type BossDef, type BossGimmick } from "../data/bosses.ts";

export const STARTING_MOVES = 40;
export { STAGE1_BOSS_HP, STAGE1_BOSS_NAME, STAGE1_BOSS_ARMOR } from "../data/bosses.ts";

export type RunProgress = {
  level: number;
  xp: number;
  xpToNext: number;
  moves: number;
  pendingLevelUps: number;
  bossId: string;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  bossArmor: number;
  bossArmorMax: number;
  bossLate: boolean;
  bossGimmicks: BossGimmick[];
};

export function xpForNextLevel(level: number): number {
  return 10 + level * 10;
}

export function createRun(boss: BossDef = STAGE1_BOSS): RunProgress {
  const armor = armorStart(boss);
  return {
    level: 1,
    xp: 0,
    xpToNext: xpForNextLevel(1),
    moves: STARTING_MOVES,
    pendingLevelUps: 0,
    bossId: boss.id,
    bossName: boss.name,
    bossHp: boss.hp,
    bossMaxHp: boss.hp,
    bossArmor: armor,
    bossArmorMax: armor,
    bossLate: false,
    bossGimmicks: [...boss.gimmicks],
  };
}

export function addXp(run: RunProgress, amount: number): void {
  if (amount <= 0) return;
  run.xp += amount;
  while (run.xp >= run.xpToNext) {
    run.xp -= run.xpToNext;
    run.level += 1;
    run.pendingLevelUps += 1;
    run.xpToNext = xpForNextLevel(run.level);
  }
}
