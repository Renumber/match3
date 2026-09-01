import { describe, expect, it } from "vitest";
import { STAGE1_BOSS } from "../data/bosses.ts";
import { getTile, makeTile, resetTileIds, setTile } from "./board.ts";
import { placeBossTiles } from "./boss.ts";
import { Game } from "./game.ts";
import { hasMatch, hasPossibleSwap } from "./match.ts";
import { STARTING_MOVES, STAGE1_BOSS_ARMOR } from "./run.ts";
import { COLS, ROWS, type Tile } from "./types.ts";

function noMatchGrid() {
  resetTileIds();
  const board: (Tile | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      setTile(board, { r, c }, makeTile((r + 2 * c) % 5));
    }
  }
  return board;
}

function threeMatchSwap(game: Game): void {
  game.board = noMatchGrid();
  setTile(game.board, { r: 0, c: 0 }, makeTile(0));
  setTile(game.board, { r: 0, c: 1 }, makeTile(0));
  setTile(game.board, { r: 0, c: 2 }, makeTile(1));
  setTile(game.board, { r: 0, c: 3 }, makeTile(0));
}

describe("Game.trySwap special combo", () => {
  it("resolves special+special even without a color match", () => {
    const game = new Game(1);
    game.board = noMatchGrid();
    setTile(game.board, { r: 3, c: 3 }, makeTile(0, "bomb"));
    setTile(game.board, { r: 3, c: 4 }, makeTile(1, "lightning"));
    const moves = game.moves;
    const out = game.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
    expect(out.bounced).toBe(false);
    expect(game.moves).toBe(moves - 1);
    expect(out.result?.events.some((e) => e.type === "activate")).toBe(true);
  });

  it("rejects swaps into a golem core", () => {
    const game = new Game(1);
    const core = { r: 3, c: 3 };
    expect(getTile(game.board, core)?.blocker).toBe(true);
    const out = game.trySwap(core, { r: 3, c: 2 });
    expect(out.bounced).toBe(true);
    expect(getTile(game.board, core)?.blocker).toBe(true);
  });

  it("breaks golem cores with a special", () => {
    const game = new Game(1);
    game.board = noMatchGrid();
    placeBossTiles(game.board, STAGE1_BOSS);
    setTile(game.board, { r: 3, c: 1 }, makeTile(0, "lineH"));
    setTile(game.board, { r: 3, c: 2 }, makeTile(1, "lightning"));
    game.trySwap({ r: 3, c: 1 }, { r: 3, c: 2 });
    expect(getTile(game.board, { r: 3, c: 3 })?.blocker).toBeFalsy();
    expect(getTile(game.board, { r: 3, c: 4 })?.blocker).toBeFalsy();
  });

  it("still bounces special into a normal tile with no match", () => {
    const game = new Game(1);
    game.board = noMatchGrid();
    setTile(game.board, { r: 3, c: 3 }, makeTile(0, "bomb"));
    const moves = game.moves;
    const neighbor = getTile(game.board, { r: 3, c: 4 });
    expect(neighbor?.special).toBe("none");
    const out = game.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
    expect(out.bounced).toBe(true);
    expect(game.moves).toBe(moves);
    expect(getTile(game.board, { r: 3, c: 3 })?.special).toBe("bomb");
  });
});

describe("Game boss", () => {
  it("deals leftover damage after armor", () => {
    const game = new Game(1);
    game.run.bossArmor = 0;
    threeMatchSwap(game);
    const hp = game.bossHp;
    const out = game.trySwap({ r: 0, c: 2 }, { r: 0, c: 3 });
    expect(out.bounced).toBe(false);
    expect(out.result?.cleared).toBeGreaterThan(0);
    expect(game.bossHp).toBe(hp - (out.result?.cleared ?? 0));
    expect(game.lastDamage).toBe(out.result?.cleared);
  });

  it("blocks a small match while armor holds", () => {
    const game = new Game(1);
    game.run.bossArmor = 40;
    threeMatchSwap(game);
    const hp = game.bossHp;
    game.trySwap({ r: 0, c: 2 }, { r: 0, c: 3 });
    expect(game.bossHp).toBe(hp);
    expect(game.lastDamage).toBe(0);
    expect(game.bossArmor).toBe(40);
  });

  it("cracks armor when specials activate", () => {
    const game = new Game(1);
    game.run.bossArmor = 2;
    game.board = noMatchGrid();
    setTile(game.board, { r: 3, c: 3 }, makeTile(0, "bomb"));
    setTile(game.board, { r: 3, c: 4 }, makeTile(1, "lightning"));
    const hp = game.bossHp;
    const armor = game.bossArmor;
    game.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
    expect(game.bossArmor).toBeLessThan(armor);
    expect(game.bossHp).toBeLessThan(hp);
  });

  it("wins when the boss dies, even on the last move", () => {
    const game = new Game(1);
    game.run.moves = 1;
    game.run.bossHp = 3;
    game.run.bossArmor = 0;
    threeMatchSwap(game);
    game.trySwap({ r: 0, c: 2 }, { r: 0, c: 3 });
    expect(game.bossHp).toBe(0);
    expect(game.phase).toBe("win");
    expect(game.trySwap({ r: 0, c: 0 }, { r: 0, c: 1 }).result).toBeNull();
  });

  it("skips leftover level-ups after a kill", () => {
    const game = new Game(1);
    game.run.bossHp = 3;
    game.run.bossArmor = 0;
    game.run.xp = game.xpToNext - 1;
    threeMatchSwap(game);
    game.trySwap({ r: 0, c: 2 }, { r: 0, c: 3 });
    expect(game.phase).toBe("win");
    expect(game.offeredCards).toHaveLength(0);
  });

  it("loses when moves run out and the boss lives", () => {
    const game = new Game(1);
    game.run.moves = 1;
    game.run.bossHp = 9999;
    threeMatchSwap(game);
    game.trySwap({ r: 0, c: 2 }, { r: 0, c: 3 });
    expect(game.bossHp).toBeGreaterThan(0);
    expect(game.phase).toBe("lose");
  });

  it("levels up before losing on the last move", () => {
    const game = new Game(1);
    game.run.moves = 1;
    game.run.bossHp = 9999;
    game.run.xp = game.xpToNext - 1;
    threeMatchSwap(game);
    game.trySwap({ r: 0, c: 2 }, { r: 0, c: 3 });
    expect(game.phase).toBe("levelUp");
    while (game.phase === "levelUp") {
      const pick = game.offeredCards[0];
      expect(pick).toBeDefined();
      if (!pick) return;
      game.chooseOfferedCard(pick.id);
    }
    expect(game.phase).toBe("lose");
  });

  it("shuffles a deadlocked board on phase sync", () => {
    const game = new Game(1);
    game.board = noMatchGrid();
    expect(hasPossibleSwap(game.board)).toBe(false);
    game.grantXp(0);
    expect(game.phase).toBe("idle");
    expect(hasMatch(game.board)).toBe(false);
    expect(hasPossibleSwap(game.board)).toBe(true);
  });

  it("restart restores a fresh run", () => {
    const game = new Game(1);
    game.run.bossHp = 0;
    game.phase = "win";
    game.ownedCardIds.push("autoDetonate");
    game.restart(2);
    expect(game.phase).toBe("idle");
    expect(game.bossHp).toBe(game.bossMaxHp);
    expect(game.bossArmor).toBe(STAGE1_BOSS_ARMOR);
    expect(game.moves).toBe(STARTING_MOVES);
    expect(game.ownedCardIds).toHaveLength(0);
    expect(hasMatch(game.board)).toBe(false);
    expect(hasPossibleSwap(game.board)).toBe(true);
  });

  it("uses the given boss def for tiles and armor", () => {
    const game = new Game(1, { id: "bare", name: "맨몸", hp: 80, gimmicks: [] });
    expect(game.bossArmorMax).toBe(0);
    expect(getTile(game.board, { r: 3, c: 3 })?.blocker).toBeFalsy();
  });
});
