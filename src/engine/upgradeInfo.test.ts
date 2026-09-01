import { describe, expect, it } from "vitest";
import { LEVEL_UP_CARDS } from "../data/levelUpCards.ts";
import {
  effectLines,
  offerWeightRows,
  percent,
  runStatRows,
  squareSize,
  threeMatchKindRows,
} from "./upgradeInfo.ts";
import { applyUpgradeEffect, defaultUpgradeStats } from "./upgradeStats.ts";

describe("upgradeInfo", () => {
  it("names bomb squares from radius", () => {
    expect(squareSize(1)).toBe("3×3");
    expect(squareSize(2)).toBe("5×5");
  });

  it("lists run stats including spawn chance", () => {
    const stats = defaultUpgradeStats();
    applyUpgradeEffect(stats, { specialSpawnChance: 0.25, bombRadius: 1 });
    const rows = runStatRows(stats);
    expect(rows.some((row) => row.label === "폭탄 범위" && row.value === "5×5")).toBe(true);
    expect(rows.some((row) => row.label === "3매치 특수" && row.value === "25%")).toBe(true);
    expect(percent(0.25)).toBe("25%");
  });

  it("shows 3-match kind odds that sum near 100%", () => {
    const rows = threeMatchKindRows();
    expect(rows.map((row) => row.label).sort()).toEqual(["번개", "폭탄", "직선"].sort());
    expect(rows.some((row) => row.value.includes("가중 5"))).toBe(true);
  });

  it("marks unique owned cards as dropped from the offer pool", () => {
    const rows = offerWeightRows(["autoDetonate"]);
    const card = rows.find((row) => row.label === "자동 점화");
    expect(card?.value).toContain("풀에서 제외");
    expect(card?.value).toContain("가중 0");
  });

  it("marks unspent core cards as pinned into the offer", () => {
    const rows = offerWeightRows([]);
    const card = rows.find((row) => row.label === "자동 점화");
    expect(card?.value).toContain("핵심");
    expect(card?.value).toContain("3택 고정");
  });

  it("prints leftover line effect lines", () => {
    const card = LEVEL_UP_CARDS.find((item) => item.id === "lineEcho");
    expect(card).toBeDefined();
    if (!card) return;
    expect(effectLines(card.effect)).toContain("잔류 직선 확률 50%");
  });

  it("prints numeric effect lines for a card", () => {
    const card = LEVEL_UP_CARDS.find((item) => item.id === "specialSpawnChance");
    expect(card).toBeDefined();
    if (!card) return;
    expect(effectLines(card.effect)).toContain("3매치 특수 25%");
  });

  it("lets bomb radius stack up to 7×7", () => {
    const card = LEVEL_UP_CARDS.find((item) => item.id === "bombRadius");
    expect(card?.stackable).toBe(true);
    expect(effectLines(card?.effect ?? {})).toContain("범위 +1칸 (최대 7×7)");
  });

  it("drops bomb radius from weights after the 7×7 cap", () => {
    const stats = defaultUpgradeStats();
    stats.bombRadius = 3;
    const rows = offerWeightRows(["bombRadius", "bombRadius"], stats);
    const bomb = rows.find((row) => row.label === "폭탄 확대");
    expect(bomb?.value).toContain("풀에서 제외");
    expect(bomb?.value).toContain("가중 0");
  });
});
