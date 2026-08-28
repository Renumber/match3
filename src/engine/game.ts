import { createFilledBoard, getTile, swapTiles } from "./board.ts";
import { hasMatch } from "./match.ts";
import { mulberry32, type Rng } from "./rng.ts";
import { resolveBoard } from "./resolve.ts";
import { isAdjacent, type Pos, type Tile } from "./types.ts";
import type { ResolveResult } from "./events.ts";
import type { LevelUpCard } from "../data/levelUpCards.ts";
import { addXp, createRun, type RunProgress } from "./run.ts";
import { applyUpgradeEffect, defaultUpgradeStats, type UpgradeStats } from "./upgrades.ts";
import { offerLevelUpCards } from "./levelUp.ts";

export type GamePhase = "idle" | "levelUp";

export type SwapOutcome = {
  bounced: boolean;
  result: ResolveResult | null;
};

function createStableBoard(rng: Rng): (Tile | null)[][] {
  for (let i = 0; i < 48; i++) {
    const board = createFilledBoard(rng);
    if (!hasMatch(board)) return board;
  }
  const board = createFilledBoard(rng);
  resolveBoard(board, rng);
  return board;
}

export class Game {
  board: (Tile | null)[][];
  rng: Rng;
  lastChain = 0;
  totalCleared = 0;
  phase: GamePhase = "idle";
  run: RunProgress;
  upgrades: UpgradeStats;
  ownedCardIds: string[] = [];
  offeredCards: LevelUpCard[] = [];

  constructor(seed = 1) {
    this.rng = mulberry32(seed);
    this.board = createStableBoard(this.rng);
    this.run = createRun();
    this.upgrades = defaultUpgradeStats();
  }

  get level(): number {
    return this.run.level;
  }

  get xp(): number {
    return this.run.xp;
  }

  get xpToNext(): number {
    return this.run.xpToNext;
  }

  get moves(): number {
    return this.run.moves;
  }

  get pendingLevelUps(): number {
    return this.run.pendingLevelUps;
  }

  grantXp(amount: number): void {
    addXp(this.run, amount);
    this.syncLevelUp();
  }

  chooseOfferedCard(cardId: string): boolean {
    if (this.phase !== "levelUp") return false;
    const card = this.offeredCards.find((item) => item.id === cardId);
    if (!card) return false;
    applyUpgradeEffect(this.upgrades, card.effect);
    this.ownedCardIds.push(card.id);
    this.run.pendingLevelUps -= 1;
    this.offeredCards = [];
    this.syncLevelUp();
    return true;
  }

  trySwap(a: Pos, b: Pos): SwapOutcome {
    if (this.phase !== "idle") return { bounced: true, result: null };
    if (this.run.moves <= 0) return { bounced: true, result: null };
    if (!isAdjacent(a, b)) return { bounced: true, result: null };
    if (!getTile(this.board, a) || !getTile(this.board, b)) {
      return { bounced: true, result: null };
    }

    swapTiles(this.board, a, b);
    if (!hasMatch(this.board)) {
      swapTiles(this.board, a, b);
      return {
        bounced: true,
        result: { events: [{ type: "bounce", a, b }], cleared: 0, chain: 0 },
      };
    }

    const result = resolveBoard(this.board, this.rng, b, this.upgrades);
    this.run.moves -= 1;
    this.lastChain = result.chain;
    this.totalCleared += result.cleared;
    this.grantXp(result.cleared);
    if (
      this.upgrades.chainMoveThreshold > 0 &&
      result.chain >= this.upgrades.chainMoveThreshold
    ) {
      this.run.moves += this.upgrades.chainMoveBonus;
    }
    return {
      bounced: false,
      result: {
        ...result,
        events: [{ type: "swap", a, b }, ...result.events],
      },
    };
  }

  private syncLevelUp(): void {
    if (this.run.pendingLevelUps <= 0) {
      this.phase = "idle";
      this.offeredCards = [];
      return;
    }
    this.phase = "levelUp";
    if (this.offeredCards.length === 0) {
      this.offeredCards = offerLevelUpCards(this.rng, this.ownedCardIds);
    }
  }
}
