import "./style.css";
import { Application } from "pixi.js";
import { Game } from "./engine/game.ts";
import { mountBoard } from "./render/boardView.ts";

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

  const chainEl = document.querySelector("#chain");
  const clearedEl = document.querySelector("#cleared");

  const game = new Game(2026);
  mountBoard(app, game, {
    setChain: (value) => {
      if (chainEl) chainEl.textContent = String(value);
    },
    setCleared: (value) => {
      if (clearedEl) clearedEl.textContent = String(value);
    },
  });
}

void boot();
