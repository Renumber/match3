import type { Pos, Special, Tile } from "./types.ts";

export type FallMove = {
  id: number;
  from: Pos;
  to: Pos;
};

export type DropIn = {
  tile: Tile;
  to: Pos;
  fromR: number;
};

export type GameEvent =
  | { type: "swap"; a: Pos; b: Pos }
  | { type: "bounce"; a: Pos; b: Pos }
  | { type: "chain"; value: number }
  | { type: "highlight"; cells: Pos[] }
  | { type: "activate"; at: Pos; special: Special }
  | { type: "fxLine"; dir: "h" | "v"; index: number }
  | { type: "fxBomb"; at: Pos }
  | { type: "strike"; from: Pos; to: Pos }
  | { type: "clear"; cells: Pos[] }
  | { type: "crack"; at: Pos; hits: number }
  | { type: "bossHit"; amount: number }
  | { type: "spawn"; at: Pos; special: Special; tile: Tile }
  | { type: "fall"; moves: FallMove[] }
  | { type: "dropIn"; drops: DropIn[] };

export type ResolveResult = {
  events: GameEvent[];
  cleared: number;
  chain: number;
  blockersCleared: number;
};
