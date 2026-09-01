import "./style.css";
import { Application } from "pixi.js";
import { Game } from "./engine/game.ts";
import { mountBoard } from "./render/boardView.ts";
import { mountCodex } from "./ui/codex.ts";
import { mountHud } from "./ui/hud.ts";
import { mountLevelUp } from "./ui/levelUp.ts";
import { mountResult } from "./ui/result.ts";

async function boot(): Promise<void> {
  const app = new Application();
  const stage = document.querySelector("#stage");
  if (!(stage instanceof HTMLElement)) throw new Error("#stage missing");

  await app.init({
    background: 0x141414,
    resizeTo: stage,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  stage.appendChild(app.canvas);
  app.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  const game = new Game(2026);
  const hud = mountHud();
  mountCodex({
    ownedIds: () => game.ownedCardIds,
    stats: () => game.upgrades,
  });

  const paintBoss = (current: number, late: boolean) => {
    hud.setBoss({
      name: game.bossName,
      current,
      max: game.bossMaxHp,
      lateAt: game.bossLateAt,
      late,
      earlyColor: game.bossBar.early,
      lateColor: game.bossBar.late,
    });
  };

  const refreshHud = () => {
    hud.setChain(game.lastChain);
    hud.setCleared(game.totalCleared);
    hud.setMoves(game.moves);
    hud.setLevel(game.level);
    hud.setXp(game.xp, game.xpToNext);
    paintBoss(game.bossHp, game.bossLate);
  };

  const levelUp = mountLevelUp((cardId) => {
    game.chooseOfferedCard(cardId);
    refreshHud();
    syncOverlays();
  });

  let board: ReturnType<typeof mountBoard> | null = null;

  const result = mountResult(() => {
    game.restart();
    board?.rebuild();
    refreshHud();
    syncOverlays();
  });

  const syncOverlays = () => {
    if (game.phase === "levelUp") {
      result.hide();
      levelUp.show(game.offeredCards);
      return;
    }
    levelUp.hide();
    if (game.phase === "win" || game.phase === "lose") {
      result.show(game.phase, {
        bossName: game.bossName,
        bossHp: game.bossHp,
        bossMaxHp: game.bossMaxHp,
        cleared: game.totalCleared,
        moves: game.moves,
      });
      return;
    }
    result.hide();
  };

  refreshHud();
  board = mountBoard(app, game, {
    setChain: hud.setChain,
    setCleared: hud.setCleared,
    setBossHp: (current) =>
      paintBoss(current, current <= game.bossLateAt || game.bossLate),
    onResolved: () => {
      refreshHud();
      syncOverlays();
    },
  });
}

void boot();
