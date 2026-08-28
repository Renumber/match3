import {
  LEVEL_UP_CARDS,
  LEVEL_UP_OFFER_COUNT,
  type LevelUpCard,
} from "../data/levelUpCards.ts";
import { shuffleInPlace, type Rng } from "./rng.ts";

export function cardById(
  id: string,
  pool: LevelUpCard[] = LEVEL_UP_CARDS,
): LevelUpCard | undefined {
  return pool.find((card) => card.id === id);
}

export function offerLevelUpCards(
  rng: Rng,
  ownedIds: string[],
  pool: LevelUpCard[] = LEVEL_UP_CARDS,
  count: number = LEVEL_UP_OFFER_COUNT,
): LevelUpCard[] {
  const takenUnique = new Set(
    ownedIds.filter((id) => {
      const card = cardById(id, pool);
      return Boolean(card && !card.stackable);
    }),
  );
  const available = pool.filter((card) => !takenUnique.has(card.id));
  const shuffled = [...available];
  shuffleInPlace(shuffled, rng);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function summarizeOwnedCards(
  ownedIds: string[],
  pool: LevelUpCard[] = LEVEL_UP_CARDS,
): { id: string; title: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const id of ownedIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const summary: { id: string; title: string; count: number }[] = [];
  for (const [id, count] of counts) {
    const card = cardById(id, pool);
    summary.push({ id, title: card?.title ?? id, count });
  }
  return summary;
}
