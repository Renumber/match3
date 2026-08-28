import type { Pos, Special } from "./types.ts";

export type GameEvent =
  | { type: "clear"; cells: Pos[] }
  | { type: "spawn"; at: Pos; special: Special }
  | { type: "activate"; at: Pos; special: Special }
  | { type: "strike"; from: Pos; to: Pos }
  | { type: "chain"; value: number };

export type ResolveResult = {
  events: GameEvent[];
  cleared: number;
  chain: number;
};
