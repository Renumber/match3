import { describe, expect, it } from "vitest";
import { comboRecipe, statsWithCombo } from "./combo.ts";
import { defaultUpgradeStats } from "./upgradeStats.ts";

describe("comboRecipe", () => {
  it("looks up pairs in either order", () => {
    expect(comboRecipe("bomb", "lineH")?.extraLineCount).toBe(2);
    expect(comboRecipe("lineH", "bomb")?.extraLineCount).toBe(2);
    expect(comboRecipe("lightning", "lineV")?.strikeActivate).toBe("lineV");
  });

  it("covers the six families", () => {
    expect(comboRecipe("bomb", "bomb")?.extraBombRadius).toBe(1);
    expect(comboRecipe("lineH", "lineH")?.extraLineCount).toBe(1);
    expect(comboRecipe("lineV", "lineV")?.extraLineCount).toBe(1);
    expect(comboRecipe("lineH", "lineV")?.extraLineCount).toBe(1);
    expect(comboRecipe("lightning", "lightning")?.extraLightningTargets).toBe(4);
    expect(comboRecipe("bomb", "lightning")?.strikeActivate).toBe("bomb");
    expect(comboRecipe("lineH", "lightning")?.strikeActivate).toBe("lineH");
  });

  it("ignores normal tiles", () => {
    expect(comboRecipe("bomb", "none")).toBeUndefined();
    expect(comboRecipe("none", "none")).toBeUndefined();
  });
});

describe("statsWithCombo", () => {
  it("adds recipe extras on top of run stats", () => {
    const stats = defaultUpgradeStats();
    stats.bombRadius = 2;
    stats.extraLines = 1;
    const next = statsWithCombo(stats, {
      pair: "bomb+lineH",
      extraBombRadius: 1,
      extraLineCount: 2,
    });
    expect(next.bombRadius).toBe(3);
    expect(next.extraLines).toBe(3);
    expect(stats.bombRadius).toBe(2);
  });
});
