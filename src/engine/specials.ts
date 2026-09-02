import { inBounds, posKey, type Pos, type Special, type Tile } from "./types.ts";
import { getTile } from "./board.ts";
import type { GameEvent } from "./events.ts";
import type { Rng } from "./rng.ts";
import { extraSpecialCells, extraSpecialFx } from "./upgradeRules.ts";
import { defaultUpgradeStats, type UpgradeStats } from "./upgradeStats.ts";
import {
  bombCells,
  lightningTargets,
  lineCols,
  lineRows,
  uniquePos,
} from "./specialShape.ts";

export {
  specialFromThreeMatch,
  spreadIndices,
  THREE_MATCH_SPECIAL_WEIGHTS,
} from "./specialShape.ts";

function baseSpecialCells(
  special: Special,
  origin: Pos,
  board: (Tile | null)[][],
  rng: Rng,
  stats: UpgradeStats,
): Pos[] {
  if (special === "lineH") return lineRows([origin.r]);
  if (special === "lineV") return lineCols([origin.c]);
  if (special === "bomb") return bombCells(origin, stats.bombRadius);
  if (special === "lightning") return lightningTargets(board, origin, stats.lightningTargets, rng);
  return [];
}

export function cellsForSpecial(
  special: Special,
  origin: Pos,
  board: (Tile | null)[][],
  rng: Rng,
  stats: UpgradeStats = defaultUpgradeStats(),
): Pos[] {
  const ctx = { special, origin, board, rng, stats };
  const cells = uniquePos([
    ...baseSpecialCells(special, origin, board, rng, stats),
    ...extraSpecialCells(ctx),
  ]);
  return uniquePos([...cells, ...grazeLineBlockers(board, special, cells)]);
}

/** Horizontal lines nick plates one row away; vertical lines nick plates one col away. */
function grazeLineBlockers(board: (Tile | null)[][], special: Special, cells: Pos[]): Pos[] {
  if (special !== "lineH" && special !== "lineV") return [];
  const extra: Pos[] = [];
  const seen = new Set<string>();
  for (const cell of cells) {
    const neighbors =
      special === "lineH"
        ? [
            { r: cell.r - 1, c: cell.c },
            { r: cell.r + 1, c: cell.c },
          ]
        : [
            { r: cell.r, c: cell.c - 1 },
            { r: cell.r, c: cell.c + 1 },
          ];
    for (const at of neighbors) {
      if (!inBounds(at)) continue;
      const key = posKey(at);
      if (seen.has(key)) continue;
      if (!getTile(board, at)?.blocker) continue;
      seen.add(key);
      extra.push(at);
    }
  }
  return extra;
}

export function specialActivateFx(
  special: Special,
  origin: Pos,
  stats: UpgradeStats,
): GameEvent[] {
  const events: GameEvent[] = [];
  if (special === "lineH") events.push({ type: "fxLine", dir: "h", index: origin.r });
  if (special === "lineV") events.push({ type: "fxLine", dir: "v", index: origin.c });
  if (special === "bomb") events.push({ type: "fxBomb", at: origin });
  events.push(...extraSpecialFx({ special, origin, stats }));
  return events;
}
