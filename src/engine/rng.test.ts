import { describe, expect, it } from "vitest";
import { pickWeightedIndex, takeWeighted, mulberry32 } from "./rng.ts";

describe("pickWeightedIndex", () => {
  it("always picks the only positive weight", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(pickWeightedIndex(mulberry32(seed), [0, 4, 0])).toBe(1);
    }
  });

  it("falls back to uniform when all weights are zero", () => {
    const counts = [0, 0, 0];
    for (let seed = 0; seed < 300; seed++) {
      const idx = pickWeightedIndex(mulberry32(seed), [0, 0, 0]);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    expect(counts.every((count) => count > 40)).toBe(true);
  });
});

describe("takeWeighted", () => {
  it("returns unique items up to the requested count", () => {
    const items = ["a", "b", "c", "d"];
    const picked = takeWeighted(mulberry32(9), items, 3, () => 1);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    for (const item of picked) expect(items).toContain(item);
  });
});
