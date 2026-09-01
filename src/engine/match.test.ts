import { describe, expect, it } from "vitest";
import { boardFromColors, emptyBoard, makeTile, resetTileIds, setTile } from "./board.ts";
import { findMatches, hasMatch, hasPossibleSwap, shuffleUntilPlayable } from "./match.ts";
import { mulberry32 } from "./rng.ts";
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

function noMoveGrid() {
  resetTileIds();
  const board = emptyBoard();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      setTile(board, { r, c }, makeTile((r + 2 * c) % 5));
    }
  }
  return board;
}

describe("hasPossibleSwap", () => {
  it("finds a swap that makes three", () => {
    const board = grid(["0010...."]);
    expect(hasPossibleSwap(board)).toBe(true);
  });

  it("is false when colors are too spread to match", () => {
    expect(hasPossibleSwap(noMoveGrid())).toBe(false);
  });

  it("counts adjacent specials as a move", () => {
    const board = noMoveGrid();
    setTile(board, { r: 3, c: 3 }, makeTile(0, "bomb"));
    setTile(board, { r: 3, c: 4 }, makeTile(1, "lightning"));
    expect(hasPossibleSwap(board)).toBe(true);
  });
});

describe("shuffleUntilPlayable", () => {
  it("leaves a board with a move and no sitting match", () => {
    const board = noMoveGrid();
    shuffleUntilPlayable(board, mulberry32(3));
    expect(hasMatch(board)).toBe(false);
    expect(hasPossibleSwap(board)).toBe(true);
  });
});
