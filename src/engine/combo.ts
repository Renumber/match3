import type { Special } from "./types.ts";

export type ComboPair = `${Special}+${Special}`;

export type ComboRecipe = {
  pair: ComboPair;
  extraLineCount?: number;
  extraBombRadius?: number;
  extraLightningTargets?: number;
};

export const COMBO_RECIPES: ComboRecipe[] = [
  { pair: "bomb+bomb", extraBombRadius: 1 },
  { pair: "lineH+lineH", extraLineCount: 1 },
  { pair: "lineV+lineV", extraLineCount: 1 },
  { pair: "lightning+lightning", extraLightningTargets: 4 },
  { pair: "bomb+lineH", extraLineCount: 2 },
  { pair: "bomb+lineV", extraLineCount: 2 },
  { pair: "bomb+lightning", extraLightningTargets: 2 },
  { pair: "lineH+lightning", extraLineCount: 2 },
  { pair: "lineV+lightning", extraLineCount: 2 },
];
