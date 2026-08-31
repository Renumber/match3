import {
  LEVEL_UP_CARDS,
  LEVEL_UP_OFFER_COUNT,
  RARITY_WEIGHT,
  type LevelUpCard,
  type UpgradeTag,
} from "../data/levelUpCards.ts";
import { shuffleInPlace, takeWeighted, type Rng } from "./rng.ts";
import { UPGRADE_STAT_DEFS, type UpgradeStatKey, type UpgradeStats } from "./upgradeStats.ts";

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
  const affinityMul = 1 + TAG_AFFINITY_BONUS * Math.min(TAG_AFFINITY_CAP, matched);
  return RARITY_WEIGHT[card.rarity] * affinityMul;
}

export function isCardSpent(
  card: LevelUpCard,
  ownedIds: string[],
  stats?: UpgradeStats,
): boolean {
  if (!card.stackable && ownedIds.includes(card.id)) return true;
  if (!stats) return false;
  const keys = Object.keys(card.effect) as UpgradeStatKey[];
  if (keys.length === 0) return false;
  return keys.every((key) => {
    const def = UPGRADE_STAT_DEFS[key];
    const incoming = card.effect[key];
    if (incoming === undefined) return true;
    if (def.merge === "cap") return (stats[key] as number) >= def.cap;
    if (def.merge === "or") return Boolean(stats[key]);
    return false;
  });
}

export function offerLevelUpCards(
  rng: Rng,
  ownedIds: string[],
  pool: LevelUpCard[] = LEVEL_UP_CARDS,
  count: number = LEVEL_UP_OFFER_COUNT,
  stats?: UpgradeStats,
): LevelUpCard[] {
  const available = pool.filter((card) => !isCardSpent(card, ownedIds, stats));
  const affinity = tagAffinity(ownedIds, pool);
  const cores = available.filter((card) => card.core);
  const rest = available.filter((card) => !card.core);
  const picked: LevelUpCard[] = [];
  if (cores.length) {
    picked.push(...takeWeighted(rng, cores, 1, (card) => offerWeight(card, affinity)));
  }
  picked.push(
    ...takeWeighted(
      rng,
      rest,
      Math.min(count - picked.length, rest.length),
      (card) => offerWeight(card, affinity),
    ),
  );
  shuffleInPlace(picked, rng);
  return picked;
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
