import { Application, Container, Graphics } from "pixi.js";
import { COLS, ROWS, type Pos, type Tile } from "../engine/types.ts";
import { Game } from "../engine/game.ts";

const PALETTE = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7];
const GAP = 6;

export type HudHooks = {
  setChain: (value: number) => void;
  setCleared: (value: number) => void;
};

export function mountBoard(app: Application, game: Game, hud: HudHooks): void {
  const layer = new Container();
  app.stage.addChild(layer);

  let selected: Pos | null = null;

  const layout = () => {
    const pad = 48;
    const available = Math.min(app.screen.width, app.screen.height) - pad * 2;
    const cell = Math.floor((available - GAP * (COLS - 1)) / COLS);
    const boardW = cell * COLS + GAP * (COLS - 1);
    const boardH = cell * ROWS + GAP * (ROWS - 1);
    layer.x = Math.floor((app.screen.width - boardW) / 2);
    layer.y = Math.floor((app.screen.height - boardH) / 2);
    return cell;
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
        g.on("pointertap", () => onTap({ r, c }));
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
    const a = selected;
    selected = null;
    const outcome = game.trySwap(a, pos);
    hud.setChain(game.lastChain);
    hud.setCleared(game.totalCleared);
    if (outcome.bounced) selected = pos;
    draw();
  };

  app.renderer.on("resize", draw);
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
