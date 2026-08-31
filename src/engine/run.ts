export const STARTING_MOVES = 40;

export type RunProgress = {
  level: number;
  xp: number;
  xpToNext: number;
  moves: number;
  pendingLevelUps: number;
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
