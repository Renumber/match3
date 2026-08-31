import { describe, expect, it } from "vitest";
import { boardFromColors, getTile, resetTileIds } from "./board.ts";
import { mulberry32 } from "./rng.ts";
import { resolveBoard } from "./resolve.ts";
import { COLS, ROWS, type Tile } from "./types.ts";
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
    expect(specialsOn(board)).toEqual([]);
  });

  it("auto-detonates a spawned lightning and consumes it", () => {
    const board = grid(["00......", "00......"]);
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 0 }, stats);
    expect(result.events.some((e) => e.type === "spawn" && e.special === "lightning")).toBe(
      true,
    );
    expect(result.events.some((e) => e.type === "activate" && e.special === "lightning")).toBe(
      true,
    );
    expect(specialsOn(board)).toEqual([]);
  });

  it("auto-detonates three-match specials from spawn chance", () => {
    const board = grid(["000....."]);
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    stats.specialSpawnChance = 1;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    expect(result.events.some((e) => e.type === "spawn")).toBe(true);
    expect(result.events.some((e) => e.type === "activate")).toBe(true);
    expect(specialsOn(board)).toEqual([]);
  });

  it("draws a cross when a line auto-detonates", () => {
    const board = grid(["0000...."]);
    const stats = defaultUpgradeStats();
    stats.autoDetonate = true;
    stats.crossLine = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 3 }, stats);
    expect(result.events.some((e) => e.type === "fxLine" && e.dir === "h" && e.index === 0)).toBe(
      true,
    );
    expect(result.events.some((e) => e.type === "fxLine" && e.dir === "v" && e.index === 3)).toBe(
      true,
    );
  });
});

function specialsOn(board: (Tile | null)[][]) {
  const found: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = getTile(board, { r, c });
      if (tile && tile.special !== "none") found.push(`${tile.special}@${r},${c}`);
    }
  }
  return found;
}
