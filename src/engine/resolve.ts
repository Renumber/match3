import { type Pos, type Special, type Tile, posKey, specialFromMatch } from "./types.ts";
import { getTile, makeTile, setTile } from "./board.ts";
import { findMatches } from "./match.ts";
import { settleBoard } from "./gravity.ts";
import { cellsForSpecial } from "./specials.ts";
import type { GameEvent, ResolveResult } from "./events.ts";
import type { Rng } from "./rng.ts";

const MAX_STEPS = 80;

function addCell(set: Set<string>, cells: Pos[], p: Pos): void {
  const k = posKey(p);
  if (set.has(k)) return;
  set.add(k);
  cells.push(p);
}

export function resolveBoard(
  board: (Tile | null)[][],
  rng: Rng,
  lastMoved?: Pos,
): ResolveResult {
  const events: GameEvent[] = [];
  let cleared = 0;
  let chain = 0;

  for (let step = 0; step < MAX_STEPS; step++) {
    const matches = findMatches(board, lastMoved);
    lastMoved = undefined;
    if (matches.length === 0) break;

    chain += 1;
    events.push({ type: "chain", value: chain });

    const toClear: Pos[] = [];
    const clearSet = new Set<string>();
    const spawns: { at: Pos; special: Special; color: number }[] = [];
    const activateQueue: { at: Pos; special: Special }[] = [];
    const fxEvents: GameEvent[] = [];

    for (const match of matches) {
      const spawnSpecial = specialFromMatch(match.kind);
      const originTile = getTile(board, match.origin);
      const spawnColor = originTile?.color ?? 0;
      for (const cell of match.cells) {
        const tile = getTile(board, cell);
        if (tile && tile.special !== "none") {
          activateQueue.push({ at: cell, special: tile.special });
        }
        addCell(clearSet, toClear, cell);
      }
      if (spawnSpecial !== "none") {
        spawns.push({ at: match.origin, special: spawnSpecial, color: spawnColor });
      }
    }

    const seenActivate = new Set<string>();
    while (activateQueue.length) {
      const next = activateQueue.shift();
      if (!next) break;
      const ak = `${posKey(next.at)}:${next.special}`;
      if (seenActivate.has(ak)) continue;
      seenActivate.add(ak);
      fxEvents.push({ type: "activate", at: next.at, special: next.special });
      if (next.special === "lineH") fxEvents.push({ type: "fxLine", dir: "h", index: next.at.r });
      if (next.special === "lineV") fxEvents.push({ type: "fxLine", dir: "v", index: next.at.c });
      if (next.special === "bomb") fxEvents.push({ type: "fxBomb", at: next.at });
      const struck = cellsForSpecial(next.special, next.at, board, rng);
      for (const cell of struck) {
        if (next.special === "lightning") {
          fxEvents.push({ type: "strike", from: next.at, to: cell });
        }
        const tile = getTile(board, cell);
        if (tile && tile.special !== "none" && posKey(cell) !== posKey(next.at)) {
          activateQueue.push({ at: cell, special: tile.special });
        }
        addCell(clearSet, toClear, cell);
      }
    }

    events.push({ type: "highlight", cells: [...toClear] });
    events.push(...fxEvents);

    for (const cell of toClear) setTile(board, cell, null);
    if (toClear.length) {
      events.push({ type: "clear", cells: [...toClear] });
      cleared += toClear.length;
    }

    for (const spawn of spawns) {
      const tile = makeTile(spawn.color, spawn.special);
      setTile(board, spawn.at, tile);
      events.push({ type: "spawn", at: spawn.at, special: spawn.special, tile });
    }

    const { falls, drops } = settleBoard(board, rng);
    if (falls.length) events.push({ type: "fall", moves: falls });
    if (drops.length) events.push({ type: "dropIn", drops });
  }

  return { events, cleared, chain };
}
