// 레벨업 3택 카드 풀. 여기만 고치면 선택지가 바뀐다.
export type UpgradeEffect = {
  bombRadius?: number;
  extraLines?: number;
  lightningTargets?: number;
  specialSpawnChance?: number;
  autoDetonate?: boolean;
  chainMoveThreshold?: number;
  chainMoveBonus?: number;
};

export type LevelUpCard = {
  id: string;
  title: string;
  description: string;
  stackable: boolean;
  effect: UpgradeEffect;
};

export const LEVEL_UP_OFFER_COUNT = 3;

export const LEVEL_UP_CARDS: LevelUpCard[] = [
  {
    id: "bombRadius",
    title: "폭탄 확대",
    description: "폭탄이 더 넓게 터진다",
    stackable: true,
    effect: { bombRadius: 1 },
  },
  {
    id: "extraLine",
    title: "직선 추가",
    description: "라인이 한 줄 더 나간다",
    stackable: true,
    effect: { extraLines: 1 },
  },
  {
    id: "lightningTargets",
    title: "번개 증폭",
    description: "번개가 더 많이 친다",
    stackable: true,
    effect: { lightningTargets: 2 },
  },
  {
    id: "specialSpawnChance",
    title: "특수 생성",
    description: "3매치에서도 특수 타일이 나올 수 있다",
    stackable: true,
    effect: { specialSpawnChance: 0.25 },
  },
  {
    id: "autoDetonate",
    title: "자동 점화",
    description: "특수 타일이 생기면 바로 발동한다",
    stackable: false,
    effect: { autoDetonate: true },
  },
  {
    id: "chainMove",
    title: "체인 호흡",
    description: "Chain 15에 Move +1",
    stackable: false,
    effect: { chainMoveThreshold: 15, chainMoveBonus: 1 },
  },
];
