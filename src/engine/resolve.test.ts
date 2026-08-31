import { describe, expect, it } from "vitest";
import { boardFromColors, getTile, makeTile, resetTileIds, setTile } from "./board.ts";
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

  it("spawns a small leftover bomb that stays on the board", () => {
    const board = grid([
      "00011111",
      "11111111",
      "11111111",
      "11111111",
      "11111111",
      "11111111",
      "11111111",
      "11111111",
    ]);
    setTile(board, { r: 0, c: 1 }, makeTile(0, "bomb"));
    const stats = defaultUpgradeStats();
    stats.bombEcho = 1;
    stats.bombCross = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    const bombActivates = result.events.filter((e) => e.type === "activate" && e.special === "bomb");
    expect(result.events.some((e) => e.type === "spawn" && e.special === "bomb")).toBe(true);
    expect(bombActivates.length).toBe(1);
    expect(specialsOn(board).some((item) => item.startsWith("bomb@"))).toBe(true);
    expect(result.events.some((e) => e.type === "fxLine" && e.dir === "h" && e.index === 0)).toBe(
      true,
    );
    expect(leftoverPlain(board, "bomb")).toBe(true);
  });

  it("lets leftover bombs land before auto-detonate", () => {
    const board = grid([
      "00043210",
      "12340123",
      "23401234",
      "34012340",
      "40123401",
      "01234012",
      "12340123",
      "23401234",
    ]);
    setTile(board, { r: 0, c: 1 }, makeTile(0, "bomb"));
    const stats = defaultUpgradeStats();
    stats.bombEcho = 1;
    stats.autoDetonate = true;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    const leftoverSpawn = result.events.findIndex(
      (e) => e.type === "spawn" && e.special === "bomb" && e.tile.plain,
    );
    const settleIdx = result.events.findIndex(
      (e, i) => i > leftoverSpawn && (e.type === "fall" || e.type === "dropIn"),
    );
    const leftoverActivate = result.events.findIndex(
      (e, i) => i > leftoverSpawn && e.type === "activate" && e.special === "bomb",
    );
    expect(leftoverSpawn).toBeGreaterThan(-1);
    expect(settleIdx).toBeGreaterThan(leftoverSpawn);
    expect(leftoverActivate).toBeGreaterThan(settleIdx);
  });

  it("lets lightning leave another lightning on the board", () => {
    const board = grid([
      "000.....",
      "........",
      "1.2.3.4.",
      "........",
      ".1.2.3.4",
      "........",
      "........",
      "........",
    ]);
    setTile(board, { r: 0, c: 1 }, makeTile(0, "lightning"));
    const stats = defaultUpgradeStats();
    stats.lightningEcho = 1;
    const result = resolveBoard(board, mulberry32(1), { r: 0, c: 2 }, stats);
    const lightningActivates = result.events.filter(
      (e) => e.type === "activate" && e.special === "lightning",
    );
    expect(lightningActivates.length).toBe(1);
    expect(result.events.some((e) => e.type === "spawn" && e.special === "lightning")).toBe(true);
    expect(specialsOn(board).some((item) => item.startsWith("lightning@"))).toBe(true);
    expect(leftoverPlain(board, "lightning")).toBe(true);
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

function leftoverPlain(board: (Tile | null)[][], special: Tile["special"]): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = getTile(board, { r, c });
      if (tile && tile.special === special && tile.plain) return true;
    }
  }
  return false;
}
