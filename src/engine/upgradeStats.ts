import { BOMB_RADIUS, LIGHTNING_BASE_TARGETS } from "./types.ts";

type AddDef = { merge: "add"; default: number };
type SetDef = { merge: "set"; default: number };
type OrDef = { merge: "or"; default: boolean };
type CapDef = { merge: "cap"; default: number; cap: number };
type StatDef = AddDef | SetDef | OrDef | CapDef;

export const UPGRADE_STAT_DEFS = {
  bombRadius: { merge: "add", default: BOMB_RADIUS },
  extraLines: { merge: "add", default: 0 },
  lightningTargets: { merge: "add", default: LIGHTNING_BASE_TARGETS },
  specialSpawnChance: { merge: "cap", default: 0, cap: 1 },
  autoDetonate: { merge: "or", default: false },
  chainMoveThreshold: { merge: "set", default: 0 },
  chainMoveBonus: { merge: "add", default: 0 },
  crossLine: { merge: "or", default: false },
  bombCross: { merge: "or", default: false },
  moveOnSpecial: { merge: "add", default: 0 },
  movesOnLevel: { merge: "add", default: 0 },
  xpBonus: { merge: "cap", default: 0, cap: 1 },
} as const satisfies Record<string, StatDef>;

export type UpgradeStatKey = keyof typeof UPGRADE_STAT_DEFS;
type StatMerge<K extends UpgradeStatKey> = (typeof UPGRADE_STAT_DEFS)[K]["merge"];
export type UpgradeStats = {
  [K in UpgradeStatKey]: StatMerge<K> extends "or" ? boolean : number;
};
export type UpgradeEffect = { [K in UpgradeStatKey]?: UpgradeStats[K] };

export function defaultUpgradeStats(): UpgradeStats {
  const stats = {} as UpgradeStats;
  for (const key of Object.keys(UPGRADE_STAT_DEFS) as UpgradeStatKey[]) {
    stats[key] = UPGRADE_STAT_DEFS[key].default as never;
  }
  return stats;
}

export function applyUpgradeEffect(stats: UpgradeStats, effect: UpgradeEffect): void {
  for (const key of Object.keys(effect) as UpgradeStatKey[]) {
    const incoming = effect[key];
    if (incoming === undefined) continue;
    const def = UPGRADE_STAT_DEFS[key];
    if (def.merge === "add") {
      (stats[key] as number) += incoming as number;
    } else if (def.merge === "set") {
      (stats[key] as number) = incoming as number;
    } else if (def.merge === "or") {
      if (incoming) (stats[key] as boolean) = true;
    } else {
      (stats[key] as number) = Math.min(def.cap, (stats[key] as number) + (incoming as number));
    }
  }
}
