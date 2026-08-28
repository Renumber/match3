import { describe, expect, it } from "vitest";
import { boardFromColors, resetTileIds } from "./board.ts";
import { mulberry32 } from "./rng.ts";
import { resolveBoard } from "./resolve.ts";
import { COLS, ROWS } from "./types.ts";
import { defaultUpgradeStats } from "./upgrades.ts";

function grid(lines: string[]) {
  resetTileIds();
  const padded = lines.map((line) => line.padEnd(COLS, "."));
  while (padded.length < ROWS) padded.push(".".repeat(COLS));
  return boardFromColors(padded);
}

describe("resolveBoard", () => {
  it("spawns a line on four-match origin", () => {
    const board = grid(["0000...."]);
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 });
    expect(result.events.some((e) => e.type === "spawn" && e.special === "lineH")).toBe(
      true,
    );
    expect(result.events.some((e) => e.type === "activate")).toBe(false);
  });

  it("spawns a special from a three-match when spawn chance is 100%", () => {
    const board = grid(["000....."]);
    const stats = defaultUpgradeStats();
    stats.specialSpawnChance = 1;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    expect(result.events.some((e) => e.type === "spawn")).toBe(true);
  });

  it("can spawn line, bomb, or lightning from three-matches", () => {
    const stats = defaultUpgradeStats();
    stats.specialSpawnChance = 1;
    const kinds = new Set<string>();
    for (let seed = 0; seed < 120; seed++) {
      const board = grid(["000....."]);
      const result = resolveBoard(board, mulberry32(seed), { r: 0, c: 2 }, stats);
      for (const event of result.events) {
        if (event.type === "spawn") kinds.add(event.special);
      }
    }
    expect(kinds.has("lineH")).toBe(true);
    expect(kinds.has("bomb")).toBe(true);
    expect(kinds.has("lightning")).toBe(true);
  });

  it("auto-detonates a spawned line", () => {
    const board = grid(["0000...."]);
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 }, stats);
    expect(result.events.some((e) => e.type === "spawn" && e.special === "lineH")).toBe(
      true,
    );
    expect(result.events.some((e) => e.type === "activate" && e.special === "lineH")).toBe(
      true,
    );
    expect(
      result.events.some((e) => e.type === "fxLine" && e.dir === "h" && e.index === 0),
    ).toBe(true);
  });
});
