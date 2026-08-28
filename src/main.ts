import "./style.css";
import { Application } from "pixi.js";
import { Game } from "./engine/game.ts";
import { summarizeOwnedCards } from "./engine/levelUp.ts";
import { mountBoard } from "./render/boardView.ts";
import { mountHud } from "./ui/hud.ts";
import { mountLevelUp } from "./ui/levelUp.ts";

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

  const refreshHud = () => {
    hud.setChain(game.lastChain);
    hud.setCleared(game.totalCleared);
    hud.setMoves(game.moves);
    hud.setLevel(game.level);
    hud.setXp(game.xp, game.xpToNext);
    hud.setUpgrades(summarizeOwnedCards(game.ownedCardIds));
  };

  const levelUp = mountLevelUp((cardId) => {
    game.chooseOfferedCard(cardId);
    refreshHud();
    syncLevelUp();
  });

  const syncLevelUp = () => {
    if (game.phase === "levelUp") levelUp.show(game.offeredCards);
    else levelUp.hide();
  };

  refreshHud();
  mountBoard(app, game, {
    setChain: hud.setChain,
    setCleared: hud.setCleared,
    onResolved: () => {
      refreshHud();
      syncLevelUp();
    },
  });
}

void boot();
