export const STARTING_MOVES = 40;
export const STAGE1_BOSS_HP = 300;
export const STAGE1_BOSS_NAME = "골렘";
export const STAGE1_BOSS_ARMOR = 4;

export type RunProgress = {
  level: number;
  xp: number;
  xpToNext: number;
  moves: number;
  pendingLevelUps: number;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  bossArmor: number;
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
    bossArmor: STAGE1_BOSS_ARMOR,
  };
}

export function activateCount(events: { type: string }[]): number {
  let n = 0;
  for (const event of events) {
    if (event.type === "activate") n += 1;
  }
  return n;
}

export function applyBossHit(run: RunProgress, cleared: number, activates = 0): number {
  if (run.bossHp <= 0) return 0;
  const cracked = Math.min(run.bossArmor, Math.max(0, activates));
  run.bossArmor -= cracked;
  if (cleared <= 0) return 0;
  const raw = Math.max(0, cleared - run.bossArmor);
  const dealt = Math.min(raw, run.bossHp);
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
