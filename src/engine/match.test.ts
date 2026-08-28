import { describe, expect, it } from "vitest";
import { boardFromColors, resetTileIds } from "./board.ts";
import { findMatches } from "./match.ts";
import { COLS, ROWS } from "./types.ts";

function grid(lines: string[]) {
  resetTileIds();
  const padded = lines.map((line) => line.padEnd(COLS, "."));
  while (padded.length < ROWS) padded.push(".".repeat(COLS));
  return boardFromColors(padded);
}

describe("findMatches", () => {
  it("clears three in a row", () => {
    const matches = findMatches(grid(["000....."]));
    expect(matches).toHaveLength(1);
    expect(matches[0]?.kind).toBe("three");
    expect(matches[0]?.cells).toHaveLength(3);
  });

  it("makes horizontal line from four", () => {
    const matches = findMatches(grid(["0000...."]));
    expect(matches).toHaveLength(1);
    expect(matches[0]?.kind).toBe("lineH");
  });

  it("makes vertical line from four", () => {
    const matches = findMatches(
      grid(["0.......", "0.......", "0.......", "0......."]),
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.kind).toBe("lineV");
  });

  it("makes lightning from 2x2", () => {
    const matches = findMatches(grid(["00......", "00......"]));
    expect(matches).toHaveLength(1);
    expect(matches[0]?.kind).toBe("lightning");
    expect(matches[0]?.cells).toHaveLength(4);
  });

  it("makes bomb from L", () => {
    const matches = findMatches(
      grid(["0.......", "0.......", "000....."]),
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.kind).toBe("bomb");
    expect(matches[0]?.cells).toHaveLength(5);
  });

  it("makes bomb from T", () => {
    const matches = findMatches(
      grid(["000.....", ".0......", ".0......"]),
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.kind).toBe("bomb");
  });

  it("prefers bomb over line when T includes four-row", () => {
    const matches = findMatches(
      grid(["0000....", ".0......", ".0......"]),
    );
    expect(matches.some((m) => m.kind === "bomb")).toBe(true);
    expect(matches.some((m) => m.kind === "lineH")).toBe(false);
  });
});
