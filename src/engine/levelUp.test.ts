import { describe, expect, it } from "vitest";
import { boardFromColors, resetTileIds } from "./board.ts";
import { LEVEL_UP_CARDS, LEVEL_UP_OFFER_COUNT } from "../data/levelUpCards.ts";
import { Game } from "./game.ts";
import { offerLevelUpCards, offerWeight, tagAffinity } from "./levelUp.ts";
import { mulberry32 } from "./rng.ts";
import { defaultUpgradeStats } from "./upgradeStats.ts";

describe("level-up offers", () => {
  it("offers unique cards from the pool", () => {
    const cards = offerLevelUpCards(mulberry32(7), []);
    expect(cards).toHaveLength(LEVEL_UP_OFFER_COUNT);
    const ids = cards.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(LEVEL_UP_CARDS.some((card) => card.id === id)).toBe(true);
    }
  });

  it("drops unique cards that were already taken", () => {
    const unique = LEVEL_UP_CARDS.filter((card) => !card.stackable);
    const owned = unique.map((card) => card.id);
    const cards = offerLevelUpCards(mulberry32(3), owned);
    expect(cards.every((card) => card.stackable)).toBe(true);
    expect(cards.some((card) => owned.includes(card.id))).toBe(false);
  });

  it("drops stackable cards once their cap is reached", () => {
    const stats = defaultUpgradeStats();
    stats.bombRadius = 3;
    const cards = offerLevelUpCards(
      mulberry32(3),
      ["bombRadius", "bombRadius"],
      undefined,
      undefined,
      stats,
    );
    expect(cards.some((card) => card.id === "bombRadius")).toBe(false);
  });

  it("tags at most one of bomb, line, lightning", () => {
    const allowed = new Set(["line", "bomb", "lightning"]);
    const tagged = LEVEL_UP_CARDS.filter((card) => card.tags.length > 0);
    expect(tagged.length).toBeGreaterThan(0);
    for (const card of tagged) {
      expect(card.tags).toHaveLength(1);
      expect(allowed.has(card.tags[0] ?? "")).toBe(true);
    }
  });

  it("nudges later offers toward a picked build without locking it in", () => {
    const owned = ["bombEcho", "bombEcho"];
    const affinity = tagAffinity(owned);
    const bomb = LEVEL_UP_CARDS.find((card) => card.id === "bombEcho");
    const line = LEVEL_UP_CARDS.find((card) => card.id === "extraLine");
    const chain = LEVEL_UP_CARDS.find((card) => card.id === "chainMove");
    expect(bomb && line && chain).toBeTruthy();
    if (!bomb || !line || !chain) return;
    expect(offerWeight(bomb, affinity)).toBe(3);
    expect(offerWeight(line, affinity)).toBe(1);
    expect(offerWeight(chain, affinity)).toBe(1);

    const extraOwned = ["bombEcho", "bombEcho", "bombEcho", "bombEcho"];
    expect(offerWeight(bomb, tagAffinity(extraOwned))).toBe(3);

    const counts = { bombEcho: 0, extraLine: 0 };
    for (let seed = 0; seed < 240; seed++) {
      const cards = offerLevelUpCards(mulberry32(seed), owned);
      if (cards.some((card) => card.id === "bombEcho")) counts.bombEcho += 1;
      if (cards.some((card) => card.id === "extraLine")) counts.extraLine += 1;
    }
    expect(counts.bombEcho).toBeGreaterThan(counts.extraLine);
    expect(counts.extraLine).toBeGreaterThan(20);
  });
});

describe("Game level-up", () => {
  it("pauses for a 3-choice after enough xp", () => {
    const game = new Game(11);
    game.grantXp(game.xpToNext);
    expect(game.phase).toBe("levelUp");
    expect(game.offeredCards).toHaveLength(3);
    expect(game.trySwap({ r: 0, c: 0 }, { r: 0, c: 1 }).result).toBeNull();
  });

  it("applies the chosen card and returns to idle", () => {
    const game = new Game(11);
    game.grantXp(game.xpToNext);
    const pick = game.offeredCards[0];
    expect(pick).toBeDefined();
    if (!pick) return;
    expect(game.chooseOfferedCard(pick.id)).toBe(true);
    expect(game.ownedCardIds).toEqual([pick.id]);
    expect(game.phase).toBe("idle");
    expect(game.offeredCards).toHaveLength(0);
  });

  it("shows another offer when two levels arrive at once", () => {
    const game = new Game(11);
    game.grantXp(game.xpToNext + game.xpToNext + 40);
    expect(game.pendingLevelUps).toBeGreaterThanOrEqual(2);
    const first = game.offeredCards[0];
    expect(first).toBeDefined();
    if (!first) return;
    game.chooseOfferedCard(first.id);
    expect(game.phase).toBe("levelUp");
    expect(game.offeredCards).toHaveLength(3);
  });

  it("grants moves on later level-ups", () => {
    const game = new Game(11);
    game.upgrades.movesOnLevel = 2;
    const before = game.moves;
    game.grantXp(game.xpToNext);
    expect(game.moves).toBe(before + 2);
  });

  it("refunds a move when a special fires", () => {
    resetTileIds();
    const game = new Game(1);
    game.upgrades.autoDetonate = true;
    game.upgrades.moveOnSpecial = 1;
    game.board = boardFromColors(["00010..."]);
    const before = game.moves;
    const out = game.trySwap({ r: 0, c: 3 }, { r: 0, c: 4 });
    expect(out.bounced).toBe(false);
    expect(out.result?.events.some((event) => event.type === "activate")).toBe(true);
    expect(game.moves).toBe(before);
  });
});
