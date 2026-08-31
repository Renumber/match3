import {
  LEVEL_UP_CARDS,
  LEVEL_UP_OFFER_COUNT,
  type LevelUpCard,
  type UpgradeTag,
} from "../data/levelUpCards.ts";
import { takeWeighted, type Rng } from "./rng.ts";

export const TAG_AFFINITY_BONUS = 1;
export const TAG_AFFINITY_CAP = 2;

export function cardById(
  id: string,
  pool: LevelUpCard[] = LEVEL_UP_CARDS,
): LevelUpCard | undefined {
  return pool.find((card) => card.id === id);
}

export function tagAffinity(
  ownedIds: string[],
  pool: LevelUpCard[] = LEVEL_UP_CARDS,
): Map<UpgradeTag, number> {
  const affinity = new Map<UpgradeTag, number>();
  for (const id of ownedIds) {
    const card = cardById(id, pool);
    if (!card) continue;
    for (const tag of card.tags) {
      affinity.set(tag, (affinity.get(tag) ?? 0) + 1);
    }
  }
  return affinity;
}

export function offerWeight(
  card: LevelUpCard,
  affinity: Map<UpgradeTag, number>,
): number {
  let matched = 0;
  for (const tag of card.tags) {
    matched += affinity.get(tag) ?? 0;
  }
  return 1 + TAG_AFFINITY_BONUS * Math.min(TAG_AFFINITY_CAP, matched);
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
  const affinity = tagAffinity(ownedIds, pool);
  return takeWeighted(
    rng,
    available,
    Math.min(count, available.length),
    (card) => offerWeight(card, affinity),
  );
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
