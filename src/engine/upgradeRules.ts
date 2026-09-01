// 업글 규칙 레지스트리.
// 새 규칙 추가:
//   1. 숫자/플래그 필요하면 upgradeStats.ts `UPGRADE_STAT_DEFS`
//   2. 이 파일 `UPGRADE_RULES`에 훅 객체 하나
//   3. data/levelUpCards.ts에 카드
// game / resolve / specials는 아래 runner만 호출. 카드 전용 if 넣지 말 것.
// 훅 종류가 모자라면 UpgradeRule에 필드 하나 + runner 하나 + 엔진 호출 한 줄.

import { COLS, ROWS, inBounds, posKey, type Pos, type Special, type Tile } from "./types.ts";
import type { GameEvent, ResolveResult } from "./events.ts";
import { pickInt, shuffleInPlace, type Rng } from "./rng.ts";
import {
  lineCols,
  lineRows,
  specialFromThreeMatch,
  spreadIndices,
  squareCorners,
} from "./specialShape.ts";
import { echoChance, UPGRADE_STAT_DEFS, type UpgradeStats } from "./upgradeStats.ts";

export type SpecialOriginCtx = {
  special: Special;
  origin: Pos;
  stats: UpgradeStats;
};

export type SpecialCellCtx = SpecialOriginCtx & {
  board: (Tile | null)[][];
  rng: Rng;
};

export type EchoBurst = {
  at: Pos;
  special: Special;
};

export type UpgradeRule = {
  id: string;
  extraCells?: (ctx: SpecialCellCtx) => Pos[];
  extraFx?: (ctx: SpecialOriginCtx) => GameEvent[];
  echoBursts?: (ctx: SpecialCellCtx & { struck: Pos[]; echoDepth?: number }) => EchoBurst[];
  threeMatchSpawn?: (ctx: {
    cells: Pos[];
    origin: Pos;
    rng: Rng;
    stats: UpgradeStats;
  }) => Special | "none" | undefined;
  shouldAutoDetonate?: (stats: UpgradeStats) => boolean;
  movesAfterResolve?: (ctx: { result: ResolveResult; stats: UpgradeStats }) => number;
  movesOnLevel?: (ctx: { gained: number; stats: UpgradeStats }) => number;
  bonusXp?: (cleared: number, stats: UpgradeStats) => number;
};

const extraLine: UpgradeRule = {
  id: "extraLine",
  extraCells: ({ special, origin, stats }) => {
    if (stats.extraLines <= 0) return [];
    if (special === "lineH") {
      const extra = spreadIndices(origin.r, stats.extraLines, ROWS).filter((i) => i !== origin.r);
      return lineRows(extra);
    }
    if (special === "lineV") {
      const extra = spreadIndices(origin.c, stats.extraLines, COLS).filter((i) => i !== origin.c);
      return lineCols(extra);
    }
    return [];
  },
  extraFx: ({ special, origin, stats }) => {
    if (stats.extraLines <= 0) return [];
    if (special === "lineH") {
      return spreadIndices(origin.r, stats.extraLines, ROWS)
        .filter((i) => i !== origin.r)
        .map((index) => ({ type: "fxLine" as const, dir: "h" as const, index }));
    }
    if (special === "lineV") {
      return spreadIndices(origin.c, stats.extraLines, COLS)
        .filter((i) => i !== origin.c)
        .map((index) => ({ type: "fxLine" as const, dir: "v" as const, index }));
    }
    return [];
  },
};

const crossLine: UpgradeRule = {
  id: "crossLine",
  extraCells: ({ special, origin, stats }) => {
    if (!stats.crossLine) return [];
    if (special === "lineH") return lineCols([origin.c]);
    if (special === "lineV") return lineRows([origin.r]);
    return [];
  },
  extraFx: ({ special, origin, stats }) => {
    if (!stats.crossLine) return [];
    if (special === "lineH") return [{ type: "fxLine", dir: "v", index: origin.c }];
    if (special === "lineV") return [{ type: "fxLine", dir: "h", index: origin.r }];
    return [];
  },
};

const bombCross: UpgradeRule = {
  id: "bombCross",
  extraCells: ({ special, origin, stats }) => {
    if (!stats.bombCross || special !== "bomb") return [];
    return [...lineRows([origin.r]), ...lineCols([origin.c])];
  },
  extraFx: ({ special, origin, stats }) => {
    if (!stats.bombCross || special !== "bomb") return [];
    return [
      { type: "fxLine", dir: "h", index: origin.r },
      { type: "fxLine", dir: "v", index: origin.c },
    ];
  },
};

function struckWithoutOrigin(struck: Pos[], origin: Pos): Pos[] {
  return struck.filter((cell) => cell.r !== origin.r || cell.c !== origin.c);
}

function pickLineDir(rng: Rng): "lineH" | "lineV" {
  return rng() < 0.5 ? "lineH" : "lineV";
}

function rollEchoes(
  cells: Pos[],
  chance: number,
  rng: Rng,
  specialOf: (rng: Rng) => Special,
  maxCount: number,
): EchoBurst[] {
  if (chance <= 0 || maxCount <= 0 || cells.length === 0) return [];
  const pool = [...cells];
  shuffleInPlace(pool, rng);
  const out: EchoBurst[] = [];
  for (const at of pool) {
    if (out.length >= maxCount) break;
    if (rng() >= chance) continue;
    out.push({ at, special: specialOf(rng) });
  }
  return out;
}

const lineEcho: UpgradeRule = {
  id: "lineEcho",
  echoBursts: ({ special, origin, stats, struck, rng, echoDepth = 0 }) => {
    if ((special !== "lineH" && special !== "lineV") || stats.lineEcho <= 0) return [];
    return rollEchoes(
      struckWithoutOrigin(struck, origin),
      echoChance(stats.lineEcho, UPGRADE_STAT_DEFS.lineEcho.cap, echoDepth),
      rng,
      pickLineDir,
      UPGRADE_STAT_DEFS.lineEcho.cap,
    );
  },
};

const bombEcho: UpgradeRule = {
  id: "bombEcho",
  echoBursts: ({ special, origin, stats, rng, echoDepth = 0 }) => {
    if (special !== "bomb" || stats.bombEcho <= 0) return [];
    return rollEchoes(
      squareCorners(origin, stats.bombRadius),
      echoChance(stats.bombEcho, UPGRADE_STAT_DEFS.bombEcho.cap, echoDepth),
      rng,
      () => "bomb",
      UPGRADE_STAT_DEFS.bombEcho.cap,
    );
  },
};

const lightningEcho: UpgradeRule = {
  id: "lightningEcho",
  echoBursts: ({ special, origin, stats, struck, rng, echoDepth = 0 }) => {
    if (special !== "lightning" || stats.lightningEcho <= 0) return [];
    return rollEchoes(
      struckWithoutOrigin(struck, origin),
      echoChance(stats.lightningEcho, UPGRADE_STAT_DEFS.lightningEcho.cap, echoDepth),
      rng,
      () => "lightning",
      UPGRADE_STAT_DEFS.lightningEcho.cap,
    );
  },
};

const lightningSeedBomb: UpgradeRule = {
  id: "lightningSeedBomb",
  echoBursts: ({ special, origin, stats, struck, rng, echoDepth = 0 }) => {
    if (special !== "lightning" || !stats.lightningSeedBomb || echoDepth > 0) return [];
    const cells = struckWithoutOrigin(struck, origin);
    if (!cells.length) return [];
    const at = cells[pickInt(rng, cells.length)];
    return at ? [{ at, special: "bomb" }] : [];
  },
};

const specialSpawn: UpgradeRule = {
  id: "specialSpawn",
  threeMatchSpawn: ({ cells, origin, rng, stats }) => {
    if (stats.specialSpawnChance <= 0 || rng() >= stats.specialSpawnChance) return undefined;
    return specialFromThreeMatch(cells, origin, rng);
  },
};

const autoDetonate: UpgradeRule = {
  id: "autoDetonate",
  shouldAutoDetonate: (stats) => stats.autoDetonate,
};

const chainMove: UpgradeRule = {
  id: "chainMove",
  movesAfterResolve: ({ result, stats }) => {
    if (stats.chainMoveThreshold <= 0 || result.chain < stats.chainMoveThreshold) return 0;
    return stats.chainMoveBonus;
  },
};

const moveOnSpecial: UpgradeRule = {
  id: "moveOnSpecial",
  movesAfterResolve: ({ result, stats }) => {
    if (stats.moveOnSpecial <= 0) return 0;
    if (!result.events.some((event) => event.type === "activate")) return 0;
    return stats.moveOnSpecial;
  },
};

const movesOnLevel: UpgradeRule = {
  id: "movesOnLevel",
  movesOnLevel: ({ gained, stats }) => gained * stats.movesOnLevel,
};

const xpBoost: UpgradeRule = {
  id: "xpBoost",
  bonusXp: (cleared, stats) => Math.round(cleared * stats.xpBonus),
};

export const UPGRADE_RULES: UpgradeRule[] = [
  extraLine,
  crossLine,
  lineEcho,
  bombCross,
  bombEcho,
  lightningEcho,
  lightningSeedBomb,
  specialSpawn,
  autoDetonate,
  chainMove,
  moveOnSpecial,
  movesOnLevel,
  xpBoost,
];

export function extraSpecialCells(ctx: SpecialCellCtx): Pos[] {
  const cells: Pos[] = [];
  for (const rule of UPGRADE_RULES) {
    if (rule.extraCells) cells.push(...rule.extraCells(ctx));
  }
  return cells;
}

export function extraSpecialFx(ctx: SpecialOriginCtx): GameEvent[] {
  const events: GameEvent[] = [];
  for (const rule of UPGRADE_RULES) {
    if (rule.extraFx) events.push(...rule.extraFx(ctx));
  }
  return events;
}

export function collectEchoBursts(
  ctx: SpecialCellCtx & { struck: Pos[]; echoDepth?: number },
): EchoBurst[] {
  const bursts: EchoBurst[] = [];
  const seen = new Set<string>();
  for (const rule of UPGRADE_RULES) {
    for (const burst of rule.echoBursts?.(ctx) ?? []) {
      if (!inBounds(burst.at)) continue;
      const key = `${posKey(burst.at)}:${burst.special}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bursts.push(burst);
    }
  }
  return bursts;
}

export function spawnFromThreeMatch(
  cells: Pos[],
  origin: Pos,
  rng: Rng,
  stats: UpgradeStats,
): Special {
  for (const rule of UPGRADE_RULES) {
    const spawned = rule.threeMatchSpawn?.({ cells, origin, rng, stats });
    if (spawned !== undefined) return spawned;
  }
  return "none";
}

export function shouldAutoDetonate(stats: UpgradeStats): boolean {
  return UPGRADE_RULES.some((rule) => rule.shouldAutoDetonate?.(stats));
}

export function extraMovesAfterResolve(result: ResolveResult, stats: UpgradeStats): number {
  let moves = 0;
  for (const rule of UPGRADE_RULES) {
    moves += rule.movesAfterResolve?.({ result, stats }) ?? 0;
  }
  return moves;
}

export function extraMovesOnLevel(gained: number, stats: UpgradeStats): number {
  let moves = 0;
  for (const rule of UPGRADE_RULES) {
    moves += rule.movesOnLevel?.({ gained, stats }) ?? 0;
  }
  return moves;
}

export function xpFromClears(cleared: number, stats: UpgradeStats): number {
  let bonus = 0;
  for (const rule of UPGRADE_RULES) {
    bonus += rule.bonusXp?.(cleared, stats) ?? 0;
  }
  return cleared + bonus;
}
