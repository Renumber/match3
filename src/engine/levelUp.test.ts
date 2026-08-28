import { describe, expect, it } from "vitest";
import { LEVEL_UP_CARDS, LEVEL_UP_OFFER_COUNT } from "../data/levelUpCards.ts";
import { Game } from "./game.ts";
import { offerLevelUpCards } from "./levelUp.ts";
import { mulberry32 } from "./rng.ts";

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
});
