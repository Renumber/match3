import { BOMB_RADIUS, LIGHTNING_BASE_TARGETS } from "./types.ts";
import type { UpgradeEffect } from "../data/levelUpCards.ts";

export type UpgradeStats = {
  bombRadius: number;
  extraLines: number;
  lightningTargets: number;
  specialSpawnChance: number;
  autoDetonate: boolean;
  chainMoveThreshold: number;
  chainMoveBonus: number;
};

export function defaultUpgradeStats(): UpgradeStats {
  return {
    bombRadius: BOMB_RADIUS,
    extraLines: 0,
    lightningTargets: LIGHTNING_BASE_TARGETS,
    specialSpawnChance: 0,
    autoDetonate: false,
    chainMoveThreshold: 0,
    chainMoveBonus: 0,
  };
}

export function applyUpgradeEffect(stats: UpgradeStats, effect: UpgradeEffect): void {
  if (effect.bombRadius) stats.bombRadius += effect.bombRadius;
  if (effect.extraLines) stats.extraLines += effect.extraLines;
  if (effect.lightningTargets) stats.lightningTargets += effect.lightningTargets;
  if (effect.specialSpawnChance) {
    stats.specialSpawnChance = Math.min(1, stats.specialSpawnChance + effect.specialSpawnChance);
  }
  if (effect.autoDetonate) stats.autoDetonate = true;
  if (effect.chainMoveThreshold) stats.chainMoveThreshold = effect.chainMoveThreshold;
  if (effect.chainMoveBonus) stats.chainMoveBonus += effect.chainMoveBonus;
}
