import { bothSpecials } from "./combo.ts";
import { createFilledBoard, getTile, swapTiles } from "./board.ts";
import { applyResolveToBoss, armorHitsOnBoard, placeBossTiles, platePositions, syncBossTiles } from "./boss.ts";
import { hasMatch, hasPossibleSwap, shuffleUntilPlayable } from "./match.ts";
import { mulberry32, type Rng } from "./rng.ts";
import { resolveBoard } from "./resolve.ts";
import { isAdjacent, type Pos, type Tile } from "./types.ts";
import type { ResolveResult } from "./events.ts";
import { plateLateAt, STAGE1_BOSS, type BossDef } from "../data/bosses.ts";
import type { LevelUpCard } from "../data/levelUpCards.ts";
import { addXp, createRun, type RunProgress } from "./run.ts";
import {
  extraMovesAfterResolve,
  extraMovesOnLevel,
  xpFromClears,
} from "./upgradeRules.ts";
import { applyUpgradeEffect, defaultUpgradeStats, type UpgradeStats } from "./upgradeStats.ts";
import { offerLevelUpCards } from "./levelUp.ts";

export type GamePhase = "idle" | "levelUp" | "win" | "lose";

export type SwapOutcome = {
  bounced: boolean;
  result: ResolveResult | null;
};

function createStableBoard(rng: Rng, boss: BossDef): (Tile | null)[][] {
  for (let i = 0; i < 48; i++) {
    const board = createFilledBoard(rng);
    placeBossTiles(board, boss);
    if (!hasMatch(board) && hasPossibleSwap(board)) return board;
  }
  const board = createFilledBoard(rng);
  placeBossTiles(board, boss);
  resolveBoard(board, rng);
  if (!hasPossibleSwap(board)) shuffleUntilPlayable(board, rng);
  return board;
}

export class Game {
  board: (Tile | null)[][];
  rng: Rng;
  boss: BossDef;
  lastChain = 0;
  totalCleared = 0;
  lastDamage = 0;
  phase: GamePhase = "idle";
  run: RunProgress;
  upgrades: UpgradeStats;
  ownedCardIds: string[] = [];
  offeredCards: LevelUpCard[] = [];

  constructor(seed = 1, boss: BossDef = STAGE1_BOSS) {
    this.boss = boss;
    this.rng = mulberry32(seed);
    this.board = createStableBoard(this.rng, boss);
    this.run = createRun(boss);
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

  get bossName(): string {
    return this.run.bossName;
  }

  get bossHp(): number {
    return this.run.bossHp;
  }

  get bossMaxHp(): number {
    return this.run.bossMaxHp;
  }

  get bossArmor(): number {
    return armorHitsOnBoard(this.board);
  }

  get bossArmorMax(): number {
    return this.run.bossArmorMax;
  }

  get bossLateAt(): number {
    return plateLateAt(this.boss);
  }

  get bossLate(): boolean {
    return this.run.bossLate;
  }

  get bossBar(): { early?: string; late?: string } {
    return this.boss.bar ?? {};
  }

  grantXp(amount: number): void {
    const before = this.run.level;
    addXp(this.run, amount);
    const gained = this.run.level - before;
    if (gained > 0) this.run.moves += extraMovesOnLevel(gained, this.upgrades);
    this.syncPhase();
  }

  restart(seed = Date.now()): void {
    this.rng = mulberry32(seed);
    this.board = createStableBoard(this.rng, this.boss);
    this.lastChain = 0;
    this.totalCleared = 0;
    this.lastDamage = 0;
    this.phase = "idle";
    this.run = createRun(this.boss);
    this.upgrades = defaultUpgradeStats();
    this.ownedCardIds = [];
    this.offeredCards = [];
  }

  chooseOfferedCard(cardId: string): boolean {
    if (this.phase !== "levelUp") return false;
    const card = this.offeredCards.find((item) => item.id === cardId);
    if (!card) return false;
    applyUpgradeEffect(this.upgrades, card.effect);
    this.ownedCardIds.push(card.id);
    this.run.pendingLevelUps -= 1;
    this.offeredCards = [];
    this.syncPhase();
    return true;
  }

  trySwap(a: Pos, b: Pos): SwapOutcome {
    if (this.phase !== "idle") return { bounced: true, result: null };
    if (this.run.moves <= 0) return { bounced: true, result: null };
    if (!isAdjacent(a, b)) return { bounced: true, result: null };
    const tileA = getTile(this.board, a);
    const tileB = getTile(this.board, b);
    if (!tileA || !tileB) {
      return { bounced: true, result: null };
    }
    if (tileA.blocker || tileB.blocker) {
      return { bounced: true, result: null };
    }
    const specialSwap = bothSpecials(tileA.special, tileB.special);
    const beforePlates = platePositions(this.board);

    swapTiles(this.board, a, b);
    if (!specialSwap && !hasMatch(this.board)) {
      swapTiles(this.board, a, b);
      this.lastDamage = 0;
      return {
        bounced: true,
        result: { events: [{ type: "bounce", a, b }], cleared: 0, chain: 0, blockersCleared: 0 },
      };
    }

    const result = resolveBoard(
      this.board,
      this.rng,
      b,
      this.upgrades,
      specialSwap ? { a, b } : undefined,
    );
    const destroyedPlates = beforePlates.filter((at) => !getTile(this.board, at)?.blocker);
    this.run.moves -= 1;
    this.lastChain = result.chain;
    this.totalCleared += result.cleared;
    this.lastDamage = applyResolveToBoss(this.run, result);
    syncBossTiles(this.board, this.rng, this.run, this.boss, destroyedPlates);
    this.grantXp(xpFromClears(result.cleared, this.upgrades));
    this.run.moves += extraMovesAfterResolve(result, this.upgrades);
    this.syncPhase();
    const extra: ResolveResult["events"] = [];
    if (this.lastDamage > 0) extra.push({ type: "bossHit", amount: this.lastDamage });
    return {
      bounced: false,
      result: {
        ...result,
        events: [{ type: "swap", a, b }, ...result.events, ...extra],
      },
    };
  }

  private ensurePlayable(): void {
    if (hasPossibleSwap(this.board)) return;
    shuffleUntilPlayable(this.board, this.rng);
  }

  private syncPhase(): void {
    if (this.run.bossHp <= 0) {
      this.phase = "win";
      this.offeredCards = [];
      return;
    }
    this.ensurePlayable();
    if (this.run.pendingLevelUps > 0) {
      this.phase = "levelUp";
      if (this.offeredCards.length === 0) {
        this.offeredCards = offerLevelUpCards(this.rng, this.ownedCardIds, undefined, undefined, this.upgrades);
      }
      return;
    }
    if (this.run.moves <= 0) {
      this.phase = "lose";
      this.offeredCards = [];
      return;
    }
    this.phase = "idle";
    this.offeredCards = [];
  }
}
