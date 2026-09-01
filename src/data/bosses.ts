import type { Pos } from "../engine/types.ts";

export type ArmorGimmick = {
  type: "armor";
  start: number;
  crackOnActivate: number;
  crackOnBlocker: number;
};

export type CoresGimmick = {
  type: "cores";
  cells: Pos[];
};

export type PlatesGimmick = {
  type: "plates";
  cells: Pos[];
  hits: number;
  damage: number;
  /** Remaining HP that opens late phase. 0 = no late phase. */
  lateAt?: number;
};

export type BossGimmick = ArmorGimmick | CoresGimmick | PlatesGimmick;

export type BossDef = {
  id: string;
  name: string;
  hp: number;
  gimmicks: BossGimmick[];
};

const GOLEM_PLATES: Pos[] = [
  { r: 3, c: 3 },
  { r: 3, c: 4 },
  { r: 4, c: 3 },
  { r: 4, c: 4 },
];

export const GOLEM: BossDef = {
  id: "golem",
  name: "골렘",
  hp: 30,
  gimmicks: [
    { type: "plates", cells: GOLEM_PLATES, hits: 1, damage: 1, lateAt: 10 },
  ],
};

export const BOSSES: BossDef[] = [GOLEM];

export const STAGE1_BOSS = GOLEM;
export const STAGE1_BOSS_NAME = GOLEM.name;
export const STAGE1_BOSS_HP = GOLEM.hp;

export function platesGimmick(def: BossDef): PlatesGimmick | undefined {
  return def.gimmicks.find((gimmick): gimmick is PlatesGimmick => gimmick.type === "plates");
}

export function plateLateAt(def: BossDef): number {
  return platesGimmick(def)?.lateAt ?? 0;
}

export function armorStart(def: BossDef): number {
  for (const gimmick of def.gimmicks) {
    if (gimmick.type === "armor") return gimmick.start;
    if (gimmick.type === "plates") return gimmick.cells.length * gimmick.hits;
  }
  return 0;
}

export const STAGE1_BOSS_ARMOR = armorStart(GOLEM);
