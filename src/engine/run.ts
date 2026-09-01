export const STARTING_MOVES = 40;
export const STAGE1_BOSS_HP = 300;
export const STAGE1_BOSS_NAME = "골렘";

export type RunProgress = {
  level: number;
  xp: number;
  xpToNext: number;
  moves: number;
  pendingLevelUps: number;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
};

export function xpForNextLevel(level: number): number {
  return 10 + level * 10;
}

export function createRun(): RunProgress {
  return {
    level: 1,
    xp: 0,
    xpToNext: xpForNextLevel(1),
    moves: STARTING_MOVES,
    pendingLevelUps: 0,
    bossName: STAGE1_BOSS_NAME,
    bossHp: STAGE1_BOSS_HP,
    bossMaxHp: STAGE1_BOSS_HP,
  };
}

export function applyBossDamage(run: RunProgress, cleared: number): number {
  if (cleared <= 0 || run.bossHp <= 0) return 0;
  const dealt = Math.min(cleared, run.bossHp);
  run.bossHp -= dealt;
  return dealt;
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
