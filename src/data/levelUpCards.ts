// 레벨업 3택 카드 풀.
// 기존 스탯으로 카드만 늘릴 때: 이 배열에 한 장.
// 새 규칙: upgradeStats.ts → upgradeRules.ts → 여기 카드.
import type { UpgradeEffect } from "../engine/upgradeStats.ts";

export type { UpgradeEffect };

export type UpgradeTag = "line" | "bomb" | "lightning";

export const UPGRADE_TAG_LABEL: Record<UpgradeTag, string> = {
  line: "직선",
  bomb: "폭탄",
  lightning: "번개",
};

export type LevelUpCard = {
  id: string;
  title: string;
  description: string;
  tags: UpgradeTag[];
  stackable: boolean;
  effect: UpgradeEffect;
};

export const LEVEL_UP_OFFER_COUNT = 3;

export const LEVEL_UP_CARDS: LevelUpCard[] = [
  {
    id: "bombRadius",
    title: "폭탄 확대",
    description: "폭탄이 한 칸 더 넓게 터진다",
    tags: ["bomb"],
    stackable: true,
    effect: { bombRadius: 1 },
  },
  {
    id: "extraLine",
    title: "직선 추가",
    description: "라인이 한 줄 더 나간다",
    tags: ["line"],
    stackable: true,
    effect: { extraLines: 1 },
  },
  {
    id: "lightningTargets",
    title: "번개 증폭",
    description: "번개가 더 많이 친다",
    tags: ["lightning"],
    stackable: true,
    effect: { lightningTargets: 2 },
  },
  {
    id: "specialSpawnChance",
    title: "특수 생성",
    description: "3매치에서도 특수 타일이 나올 수 있다",
    tags: [],
    stackable: true,
    effect: { specialSpawnChance: 0.25 },
  },
  {
    id: "autoDetonate",
    title: "자동 점화",
    description: "특수 타일이 생기면 바로 발동한다",
    tags: [],
    stackable: false,
    effect: { autoDetonate: true },
  },
  {
    id: "chainMove",
    title: "체인 호흡",
    description: "Chain 15에 Move +1",
    tags: [],
    stackable: false,
    effect: { chainMoveThreshold: 15, chainMoveBonus: 1 },
  },
  {
    id: "crossLine",
    title: "십자 절단",
    description: "라인이 십자로 나간다",
    tags: ["line"],
    stackable: false,
    effect: { crossLine: true },
  },
  {
    id: "bombCross",
    title: "십자 폭파",
    description: "폭탄이 십자로도 터진다",
    tags: ["bomb"],
    stackable: false,
    effect: { bombCross: true },
  },
  {
    id: "bombEcho",
    title: "파편 폭탄",
    description: "폭탄이 작은 폭탄을 남긴다",
    tags: ["bomb"],
    stackable: true,
    effect: { bombEcho: 1 },
  },
  {
    id: "lightningEcho",
    title: "잔류 번개",
    description: "맞은 칸에 번개를 남긴다",
    tags: ["lightning"],
    stackable: true,
    effect: { lightningEcho: 1 },
  },
  {
    id: "lightningSeedBomb",
    title: "낙뢰",
    description: "번개가 작은 폭탄을 떨어뜨린다",
    tags: ["lightning"],
    stackable: false,
    effect: { lightningSeedBomb: true },
  },
  {
    id: "moveOnSpecial",
    title: "특수 호흡",
    description: "특수 타일이 터지면 Move +1",
    tags: [],
    stackable: true,
    effect: { moveOnSpecial: 1 },
  },
  {
    id: "movesOnLevel",
    title: "숨 고르기",
    description: "레벨업할 때 Move +2",
    tags: [],
    stackable: true,
    effect: { movesOnLevel: 2 },
  },
  {
    id: "xpBoost",
    title: "경험 흡수",
    description: "지운 타일이 XP를 더 준다",
    tags: [],
    stackable: true,
    effect: { xpBonus: 0.25 },
  },
];
