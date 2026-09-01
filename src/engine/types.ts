export const COLS = 8;
export const ROWS = 8;
export const COLOR_COUNT = 5;
export const LIGHTNING_BASE_TARGETS = 2;
export const BOMB_RADIUS = 1;

export type ColorId = number;

export type Special = "none" | "lineH" | "lineV" | "bomb" | "lightning";

export type Pos = {
  r: number;
  c: number;
};

export type Tile = {
  id: number;
  color: ColorId;
  special: Special;
  plain?: boolean;
  echoDepth?: number;
  blocker?: boolean;
  hits?: number;
};

export function isBlocker(tile: Tile | null | undefined): boolean {
  return Boolean(tile?.blocker);
}

export type MatchKind = "three" | "lineH" | "lineV" | "bomb" | "lightning";

export type MatchGroup = {
  kind: MatchKind;
  cells: Pos[];
  origin: Pos;
};

export function posKey(p: Pos): string {
  return `${p.r},${p.c}`;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export function inBounds(p: Pos): boolean {
  return p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function specialFromMatch(kind: MatchKind): Special {
  if (kind === "lineH") return "lineH";
  if (kind === "lineV") return "lineV";
  if (kind === "bomb") return "bomb";
  if (kind === "lightning") return "lightning";
  return "none";
}
