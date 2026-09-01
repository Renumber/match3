import { LEVEL_UP_CARDS, UPGRADE_TAG_LABEL, type LevelUpCard, type UpgradeTag } from "../data/levelUpCards.ts";
import { offerWeight, isCardSpent, tagAffinity } from "./levelUp.ts";
import { THREE_MATCH_SPECIAL_WEIGHTS } from "./specialShape.ts";
import { echoChance, UPGRADE_STAT_DEFS, type UpgradeEffect, type UpgradeStats } from "./upgradeStats.ts";

export type InfoRow = {
  label: string;
  value: string;
};

const KIND_LABEL: Record<"line" | "bomb" | "lightning", string> = {
  line: "직선",
  bomb: "폭탄",
  lightning: "번개",
};

export function squareSize(radius: number): string {
  const n = radius * 2 + 1;
  return `${n}×${n}`;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function onOff(value: boolean): string {
  return value ? "켜짐" : "꺼짐";
}

export function effectLines(effect: UpgradeEffect): string[] {
  const lines: string[] = [];
  if (effect.bombRadius) {
    const cap =
      UPGRADE_STAT_DEFS.bombRadius.merge === "cap" ? UPGRADE_STAT_DEFS.bombRadius.cap : 3;
    lines.push(`범위 +1칸 (최대 ${squareSize(cap)})`);
  }
  if (effect.extraLines) lines.push(`직선 +${effect.extraLines}줄`);
  if (effect.lightningTargets) lines.push(`번개 타겟 +${effect.lightningTargets}`);
  if (effect.specialSpawnChance) lines.push(`3매치 특수 ${percent(effect.specialSpawnChance)}`);
  if (effect.autoDetonate) lines.push("특수 생성 시 즉시 발동, 인접하면 합성");
  if (effect.chainMoveThreshold) {
    lines.push(`Chain ${effect.chainMoveThreshold}에 Move +${effect.chainMoveBonus ?? 1}`);
  }
  if (effect.crossLine) lines.push("라인 십자");
  if (effect.lineEcho) {
    lines.push(`잔류 직선 확률 ${percent(effect.lineEcho / UPGRADE_STAT_DEFS.lineEcho.cap)}`);
  }
  if (effect.bombCross) lines.push("폭탄 십자");
  if (effect.bombEcho) {
    lines.push(`파편 확률 ${percent(effect.bombEcho / UPGRADE_STAT_DEFS.bombEcho.cap)}`);
  }
  if (effect.lightningEcho) {
    lines.push(`잔류 번개 확률 ${percent(effect.lightningEcho / UPGRADE_STAT_DEFS.lightningEcho.cap)}`);
  }
  if (effect.lightningSeedBomb) lines.push("번개 적중 칸에 작은 폭탄");
  if (effect.moveOnSpecial) lines.push(`특수 발동 시 Move +${effect.moveOnSpecial}`);
  if (effect.movesOnLevel) lines.push(`레벨업 Move +${effect.movesOnLevel}`);
  if (effect.xpBonus) lines.push(`지운 타일 XP +${percent(effect.xpBonus)}`);
  return lines;
}

export function runStatRows(stats: UpgradeStats): InfoRow[] {
  return [
    { label: "폭탄 범위", value: squareSize(stats.bombRadius) },
    { label: "추가 직선", value: `+${stats.extraLines}` },
    { label: "번개 타겟", value: String(stats.lightningTargets) },
    { label: "3매치 특수", value: percent(stats.specialSpawnChance) },
    { label: "자동 점화", value: onOff(stats.autoDetonate) },
    { label: "십자 절단", value: onOff(stats.crossLine) },
    {
      label: "잔류 직선",
      value:
        stats.lineEcho > 0
          ? percent(echoChance(stats.lineEcho, UPGRADE_STAT_DEFS.lineEcho.cap))
          : "꺼짐",
    },
    { label: "십자 폭파", value: onOff(stats.bombCross) },
    {
      label: "파편 폭탄",
      value:
        stats.bombEcho > 0
          ? percent(echoChance(stats.bombEcho, UPGRADE_STAT_DEFS.bombEcho.cap))
          : "꺼짐",
    },
    {
      label: "잔류 번개",
      value:
        stats.lightningEcho > 0
          ? percent(echoChance(stats.lightningEcho, UPGRADE_STAT_DEFS.lightningEcho.cap))
          : "꺼짐",
    },
    { label: "낙뢰", value: onOff(stats.lightningSeedBomb) },
    {
      label: "체인 호흡",
      value:
        stats.chainMoveThreshold > 0
          ? `Chain ${stats.chainMoveThreshold} → Move +${stats.chainMoveBonus}`
          : "꺼짐",
    },
    { label: "특수 호흡", value: `Move +${stats.moveOnSpecial}` },
    { label: "레벨업 Move", value: `+${stats.movesOnLevel}` },
    { label: "XP 보너스", value: percent(stats.xpBonus) },
  ];
}

export function spawnRuleRows(): InfoRow[] {
  return [
    { label: "4줄", value: "직선 확정" },
    { label: "T / L", value: "폭탄 확정" },
    { label: "2×2", value: "번개 확정" },
    { label: "3매치", value: "업글 없으면 특수 없음" },
  ];
}

export function threeMatchKindRows(): InfoRow[] {
  const total = THREE_MATCH_SPECIAL_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  return THREE_MATCH_SPECIAL_WEIGHTS.map((item) => ({
    label: KIND_LABEL[item.kind],
    value: `${percent(item.weight / total)} (가중 ${item.weight})`,
  }));
}

export function offerWeightRows(
  ownedIds: string[],
  stats?: UpgradeStats,
  pool: LevelUpCard[] = LEVEL_UP_CARDS,
): InfoRow[] {
  const affinity = tagAffinity(ownedIds, pool);
  return pool.map((card) => {
    const owned = ownedIds.filter((id) => id === card.id).length;
    const spent = isCardSpent(card, ownedIds, stats);
    const weight = spent ? 0 : offerWeight(card, affinity);
    const parts = [`가중 ${weight}`];
    if (card.core && !spent) parts.push("핵심", "3택 고정");
    if (owned) parts.push(`보유 ×${owned}`);
    if (spent) parts.push("풀에서 제외");
    return { label: card.title, value: parts.join(" · ") };
  });
}

export function affinityRows(ownedIds: string[]): InfoRow[] {
  const affinity = tagAffinity(ownedIds);
  return (Object.keys(UPGRADE_TAG_LABEL) as UpgradeTag[]).map((tag) => ({
    label: UPGRADE_TAG_LABEL[tag],
    value: `친화도 ${affinity.get(tag) ?? 0} → 배율 ×${1 + Math.min(2, affinity.get(tag) ?? 0)}`,
  }));
}
