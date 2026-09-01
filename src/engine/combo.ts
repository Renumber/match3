import type { Special } from "./types.ts";
import { applyUpgradeEffect, type UpgradeStats } from "./upgradeStats.ts";

export type ComboPair = `${Special}+${Special}`;

export type ComboRecipe = {
  pair: ComboPair;
  extraLineCount?: number;
  extraBombRadius?: number;
  extraLightningTargets?: number;
  /** 번개가 친 칸에서 바로 발동할 서브 특수. */
  strikeActivate?: Exclude<Special, "none">;
};

export const COMBO_RECIPES: ComboRecipe[] = [
  { pair: "bomb+bomb", extraBombRadius: 1 },
  { pair: "lineH+lineH", extraLineCount: 1 },
  { pair: "lineV+lineV", extraLineCount: 1 },
  { pair: "lineH+lineV", extraLineCount: 1 },
  { pair: "lightning+lightning", extraLightningTargets: 4 },
  { pair: "bomb+lineH", extraLineCount: 2 },
  { pair: "bomb+lineV", extraLineCount: 2 },
  { pair: "bomb+lightning", strikeActivate: "bomb" },
  { pair: "lineH+lightning", strikeActivate: "lineH" },
  { pair: "lineV+lightning", strikeActivate: "lineV" },
];

const COMBO_BY_PAIR = new Map<string, ComboRecipe>();
for (const recipe of COMBO_RECIPES) {
  COMBO_BY_PAIR.set(recipe.pair, recipe);
  const sep = recipe.pair.indexOf("+");
  const left = recipe.pair.slice(0, sep);
  const right = recipe.pair.slice(sep + 1);
  COMBO_BY_PAIR.set(`${right}+${left}`, recipe);
}

export function comboRecipe(a: Special, b: Special): ComboRecipe | undefined {
  if (a === "none" || b === "none") return undefined;
  return COMBO_BY_PAIR.get(`${a}+${b}`);
}

export function statsWithCombo(stats: UpgradeStats, recipe: ComboRecipe): UpgradeStats {
  const next = { ...stats };
  applyUpgradeEffect(next, {
    bombRadius: recipe.extraBombRadius,
    extraLines: recipe.extraLineCount,
    lightningTargets: recipe.extraLightningTargets,
  });
  return next;
}

export function comboStatsForPair(
  stats: UpgradeStats,
  a: Special,
  b: Special,
): UpgradeStats {
  const recipe = comboRecipe(a, b);
  return recipe ? statsWithCombo(stats, recipe) : stats;
}

export function bothSpecials(a: Special, b: Special): boolean {
  return a !== "none" && b !== "none";
}
