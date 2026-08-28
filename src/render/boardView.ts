import { Application, Container, Graphics, type FederatedPointerEvent } from "pixi.js";
import { COLS, ROWS, inBounds, type Pos, type Tile } from "../engine/types.ts";
import { Game } from "../engine/game.ts";

const PALETTE = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7];
const GAP = 6;

export type HudHooks = {
  setChain: (value: number) => void;
  setCleared: (value: number) => void;
};

type Drag = {
  pos: Pos;
  x: number;
  y: number;
};

export function mountBoard(app: Application, game: Game, hud: HudHooks): void {
  const layer = new Container();
  app.stage.addChild(layer);
  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;

  let selected: Pos | null = null;
  let cellSize = 40;
  let drag: Drag | null = null;

  const layout = () => {
    const padX = 16;
    const padY = 12;
    const availableW = app.screen.width - padX * 2;
    const availableH = app.screen.height - padY * 2;
    const cell = Math.max(
      28,
      Math.floor((Math.min(availableW, availableH) - GAP * (COLS - 1)) / COLS),
    );
    cellSize = cell;
    const boardW = cell * COLS + GAP * (COLS - 1);
    const boardH = cell * ROWS + GAP * (ROWS - 1);
    layer.x = Math.floor((app.screen.width - boardW) / 2);
    layer.y = Math.floor((app.screen.height - boardH) / 2);
    return cell;
  };

  const applySwap = (a: Pos, b: Pos) => {
    selected = null;
    const outcome = game.trySwap(a, b);
    hud.setChain(game.lastChain);
    hud.setCleared(game.totalCleared);
    if (outcome.bounced) selected = a;
    draw();
  };

  const finishDrag = (e: FederatedPointerEvent) => {
    if (!drag) return;
    const start = drag;
    drag = null;
    const dx = e.global.x - start.x;
    const dy = e.global.y - start.y;
    const thresh = cellSize * 0.28;
    if (Math.abs(dx) > thresh || Math.abs(dy) > thresh) {
      const b: Pos =
        Math.abs(dx) > Math.abs(dy)
          ? { r: start.pos.r, c: start.pos.c + (dx > 0 ? 1 : -1) }
          : { r: start.pos.r + (dy > 0 ? 1 : -1), c: start.pos.c };
      if (inBounds(b)) applySwap(start.pos, b);
      else draw();
      return;
    }
    onTap(start.pos);
  };

  const draw = () => {
    layer.removeChildren();
    const cell = layout();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = game.board[r]?.[c] ?? null;
        const g = new Graphics();
        g.x = c * (cell + GAP);
        g.y = r * (cell + GAP);
        drawTile(g, tile, cell, selected?.r === r && selected?.c === c);
        g.eventMode = "static";
        g.cursor = "pointer";
        g.on("pointerdown", (e: FederatedPointerEvent) => {
          drag = { pos: { r, c }, x: e.global.x, y: e.global.y };
        });
        layer.addChild(g);
      }
    }
  };

  const onTap = (pos: Pos) => {
    if (!selected) {
      selected = pos;
      draw();
      return;
    }
    if (selected.r === pos.r && selected.c === pos.c) {
      selected = null;
      draw();
      return;
    }
    applySwap(selected, pos);
  };

  app.stage.on("pointerup", finishDrag);
  app.stage.on("pointerupoutside", finishDrag);
  app.renderer.on("resize", () => {
    app.stage.hitArea = app.screen;
    draw();
  });
  draw();
}

function drawTile(g: Graphics, tile: Tile | null, size: number, selected: boolean): void {
  g.clear();
  const color = tile ? (PALETTE[tile.color] ?? 0x52525b) : 0x27272a;
  g.roundRect(0, 0, size, size, 10).fill(color);
  if (selected) {
    g.roundRect(2, 2, size - 4, size - 4, 8).stroke({ width: 3, color: 0xffffff });
  }
  if (!tile || tile.special === "none") return;
  const cx = size / 2;
  const cy = size / 2;
  g.circle(cx, cy, size * 0.16).fill(0xffffff);
  if (tile.special === "lineH") {
    g.rect(size * 0.18, cy - 2, size * 0.64, 4).fill(0x111111);
  } else if (tile.special === "lineV") {
    g.rect(cx - 2, size * 0.18, 4, size * 0.64).fill(0x111111);
  } else if (tile.special === "bomb") {
    g.circle(cx, cy, size * 0.1).fill(0x111111);
  } else if (tile.special === "lightning") {
    g.moveTo(cx + 2, cy - size * 0.12);
    g.lineTo(cx - 6, cy + 2);
    g.lineTo(cx + 1, cy + 2);
    g.lineTo(cx - 2, cy + size * 0.12);
    g.stroke({ width: 3, color: 0x111111 });
  }
}
