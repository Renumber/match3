import { Application, Container, Graphics, Rectangle, type FederatedPointerEvent } from "pixi.js";
import { COLS, ROWS, inBounds, posKey, type Pos, type Tile } from "../engine/types.ts";
import type { GameEvent } from "../engine/events.ts";
import { Game } from "../engine/game.ts";
import { playBombFx, playClearBurst, playLineFx, playStrikeFx, type Layout } from "./fx.ts";
import { animate, easeInQuad, easeOutBack, easeOutCubic, linear, swapTravel } from "./tween.ts";

const PALETTE = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7];
const GAP = 6;

export type HudHooks = {
  setChain: (value: number, punch?: boolean) => void;
  setCleared: (value: number, punch?: boolean) => void;
  setBossHp?: (current: number, max: number) => void;
  onResolved?: () => void;
};

export type BoardView = {
  rebuild: () => void;
};

type Drag = {
  pos: Pos;
  x: number;
  y: number;
};

type Occupant = {
  g: Graphics;
  tile: Tile;
};

export function mountBoard(app: Application, game: Game, hud: HudHooks): BoardView {
  const root = new Container();
  const bgLayer = new Graphics();
  const tileLayer = new Container();
  const plateLayer = new Container();
  const fxLayer = new Container();
  plateLayer.eventMode = "none";
  fxLayer.eventMode = "none";
  root.addChild(bgLayer, tileLayer, plateLayer, fxLayer);
  app.stage.addChild(root);
  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;

  let selected: Pos | null = null;
  let cellSize = 40;
  let drag: Drag | null = null;
  let busy = false;
  const occupancy = new Map<string, Occupant>();

  const layoutOf = (): Layout => ({ cell: cellSize, gap: GAP });

  const boardPixelSize = () => ({
    w: cellSize * COLS + GAP * (COLS - 1),
    h: cellSize * ROWS + GAP * (ROWS - 1),
  });

  const placeAt = (g: Graphics, r: number, c: number) => {
    g.x = c * (cellSize + GAP) + cellSize / 2;
    g.y = r * (cellSize + GAP) + cellSize / 2;
  };

  const layout = () => {
    const padX = 16;
    const padY = 12;
    const availableW = app.screen.width - padX * 2;
    const availableH = app.screen.height - padY * 2;
    cellSize = Math.max(
      28,
      Math.floor((Math.min(availableW, availableH) - GAP * (COLS - 1)) / COLS),
    );
    const { w, h } = boardPixelSize();
    root.x = Math.floor((app.screen.width - w) / 2);
    root.y = Math.floor((app.screen.height - h) / 2);
    tileLayer.hitArea = new Rectangle(0, 0, w, h);
    return cellSize;
  };

  const drawBg = () => {
    bgLayer.clear();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * (cellSize + GAP);
        const y = r * (cellSize + GAP);
        bgLayer.roundRect(x, y, cellSize, cellSize, 10).fill(0x1f1f1f);
      }
    }
  };

  const makeSprite = (tile: Tile, isSelected: boolean): Graphics => {
    const g = new Graphics();
    drawTile(g, tile, cellSize, isSelected);
    g.pivot.set(cellSize / 2, cellSize / 2);
    return g;
  };

  const rebuild = () => {
    for (const item of occupancy.values()) item.g.destroy();
    occupancy.clear();
    tileLayer.removeChildren();
    plateLayer.removeChildren();
    for (const child of [...fxLayer.children]) child.destroy();
    layout();
    drawBg();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = game.board[r]?.[c] ?? null;
        if (!tile) continue;
        const g = makeSprite(tile, selected?.r === r && selected?.c === c);
        placeAt(g, r, c);
        if (tile.blocker) plateLayer.addChild(g);
        else tileLayer.addChild(g);
        occupancy.set(posKey({ r, c }), { g, tile });
      }
    }
  };

  const pickCell = (e: FederatedPointerEvent): Pos | null => {
    const local = e.getLocalPosition(root);
    const c = Math.floor(local.x / (cellSize + GAP));
    const r = Math.floor(local.y / (cellSize + GAP));
    const pos = { r, c };
    return inBounds(pos) ? pos : null;
  };

  const lift = (g: Graphics) => {
    if (g.parent) g.parent.addChild(g);
  };

  const animSwap = async (a: Pos, b: Pos) => {
    const A = occupancy.get(posKey(a));
    const B = occupancy.get(posKey(b));
    if (!A || !B) return;
    occupancy.set(posKey(a), B);
    occupancy.set(posKey(b), A);
    lift(A.g);
    lift(B.g);
    const ax = A.g.x;
    const ay = A.g.y;
    const bx = B.g.x;
    const by = B.g.y;
    const dx = bx - ax;
    const dy = by - ay;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    await animate(
      app,
      170,
      (t) => {
        const p = swapTravel(t);
        A.g.x = ax + dx * p;
        A.g.y = ay + dy * p;
        B.g.x = bx - dx * p;
        B.g.y = by - dy * p;
        const moving = t > 0.22 && t < 0.82;
        const stretch = moving ? 1.34 : 1;
        const squash = moving ? 0.76 : 1;
        const sx = horizontal ? stretch : squash;
        const sy = horizontal ? squash : stretch;
        A.g.scale.set(sx, sy);
        B.g.scale.set(sx, sy);
      },
      linear,
    );
    A.g.position.set(bx, by);
    B.g.position.set(ax, ay);
    A.g.scale.set(1);
    B.g.scale.set(1);
  };

  const land = async (nodes: Graphics[]) => {
    if (nodes.length === 0) return;
    await animate(
      app,
      140,
      (t) => {
        const s = Math.sin(Math.min(1, t) * Math.PI);
        const sx = 1 + 0.36 * s;
        const sy = 1 - 0.42 * s;
        for (const g of nodes) g.scale.set(sx, sy);
      },
      linear,
    );
    for (const g of nodes) g.scale.set(1);
  };

  const shake = async (amount: number) => {
    const baseX = root.x;
    const baseY = root.y;
    await animate(
      app,
      220,
      (t) => {
        const decay = 1 - t;
        const kick = Math.sin(t * Math.PI * 3) * decay;
        root.x = baseX + kick * amount;
        root.y = baseY + Math.sin(t * Math.PI * 2) * decay * amount * 0.55;
      },
      linear,
    );
    root.x = baseX;
    root.y = baseY;
  };

  const playEvents = async (events: GameEvent[], clearedTotal: number) => {
    let shownCleared = game.totalCleared - clearedTotal;
    let shownHp = game.bossHp + game.lastDamage;
    hud.setCleared(shownCleared);
    hud.setBossHp?.(shownHp, game.bossMaxHp);
    let chain = 1;
    let i = 0;
    while (i < events.length) {
      const event = events[i];
      if (!event) break;
      switch (event.type) {
        case "swap":
          await animSwap(event.a, event.b);
          break;
        case "bounce":
          await animSwap(event.a, event.b);
          await animSwap(event.a, event.b);
          break;
        case "chain":
          chain = event.value;
          hud.setChain(event.value, true);
          break;
        case "highlight": {
          const items = event.cells
            .map((p) => occupancy.get(posKey(p)))
            .filter((item): item is Occupant => Boolean(item));
          const flash = new Graphics();
          fxLayer.addChild(flash);
          await animate(
            app,
            130,
            (t) => {
              const up = t < 0.45;
              const u = up ? t / 0.45 : (t - 0.45) / 0.55;
              const punch = up ? easeOutBack(u) : 1 - easeOutCubic(u) * 0.45;
              const s = 1 + 0.55 * Math.max(0, punch);
              for (const item of items) item.g.scale.set(s);
              flash.clear();
              const alpha = (up ? 0.72 * Math.min(1, u * 1.4) : 0.72 * (1 - u)) * 0.85;
              for (const item of items) {
                flash
                  .roundRect(item.g.x - cellSize / 2, item.g.y - cellSize / 2, cellSize, cellSize, 10)
                  .fill({ color: 0xffffff, alpha });
              }
            },
            linear,
          );
          for (const item of items) item.g.scale.set(1.16);
          flash.destroy();
          break;
        }
        case "fxLine":
          await playLineFx(app, fxLayer, layoutOf(), event.dir, event.index);
          break;
        case "fxBomb":
          await playBombFx(app, fxLayer, layoutOf(), event.at);
          break;
        case "strike": {
          const strikes = [event];
          while (events[i + 1]?.type === "strike") {
            i += 1;
            const next = events[i];
            if (next?.type === "strike") strikes.push(next);
          }
          await Promise.all(
            strikes.map((strike) =>
              playStrikeFx(app, fxLayer, layoutOf(), strike.from, strike.to),
            ),
          );
          break;
        }
        case "activate":
          break;
        case "crack": {
          const item = occupancy.get(posKey(event.at));
          if (item) {
            item.tile.hits = event.hits;
            drawTile(item.g, item.tile, cellSize, false);
            await animate(
              app,
              120,
              (t) => {
                const s = Math.sin(t * Math.PI);
                item.g.scale.set(1 + 0.28 * s, 1 - 0.22 * s);
              },
              linear,
            );
            item.g.scale.set(1);
          }
          break;
        }
        case "bossHit":
          shownHp = Math.max(game.bossHp, shownHp - event.amount);
          hud.setBossHp?.(shownHp, game.bossMaxHp);
          break;
        case "clear": {
          const items = event.cells
            .map((p) => occupancy.get(posKey(p)))
            .filter((item): item is Occupant => Boolean(item));
          const origins = items.map((item) => item.g.scale.x || 1);
          const points = items.map((item) => ({
            x: item.g.x,
            y: item.g.y,
            color: burstColor(item.tile),
          }));
          await Promise.all([
            animate(
              app,
              220,
              (t) => {
                for (let n = 0; n < items.length; n++) {
                  const item = items[n];
                  if (!item) continue;
                  const base = origins[n] ?? 1;
                  if (t < 0.32) {
                    const u = easeOutCubic(t / 0.32);
                    item.g.scale.set(base + (1.78 - base) * u);
                    item.g.alpha = 1;
                  } else {
                    const u = easeInQuad((t - 0.32) / 0.68);
                    item.g.scale.set(Math.max(0.05, 1.78 * (1 - u)));
                    item.g.alpha = 1 - u;
                  }
                }
              },
              linear,
            ),
            playClearBurst(app, fxLayer, points, cellSize * (1 + Math.min(0.45, (chain - 1) * 0.12))),
            shake(Math.min(12, 5 + items.length * 0.4 + chain * 0.7)),
          ]);
          for (const cell of event.cells) {
            const item = occupancy.get(posKey(cell));
            if (!item) continue;
            occupancy.delete(posKey(cell));
            item.g.destroy();
          }
          shownCleared += event.cells.length;
          hud.setCleared(shownCleared, true);
          break;
        }
        case "spawn": {
          const key = posKey(event.at);
          const existing = occupancy.get(key);
          if (existing) {
            occupancy.delete(key);
            existing.g.destroy();
          }
          const g = makeSprite(event.tile, false);
          placeAt(g, event.at.r, event.at.c);
          g.scale.set(0);
          if (event.tile.blocker) plateLayer.addChild(g);
          else tileLayer.addChild(g);
          occupancy.set(key, { g, tile: event.tile });
          await animate(app, 160, (t) => g.scale.set(t), easeOutBack);
          g.scale.set(1);
          break;
        }
        case "fall": {
          const jobs = event.moves.map((move) => ({
            item: occupancy.get(posKey(move.from)),
            from: move.from,
            to: move.to,
          }));
          for (const job of jobs) occupancy.delete(posKey(job.from));
          for (const job of jobs) {
            if (job.item) occupancy.set(posKey(job.to), job.item);
          }
          await animate(
            app,
            170,
            (t) => {
              for (const job of jobs) {
                if (!job.item) continue;
                const x0 = job.from.c * (cellSize + GAP) + cellSize / 2;
                const y0 = job.from.r * (cellSize + GAP) + cellSize / 2;
                const x1 = job.to.c * (cellSize + GAP) + cellSize / 2;
                const y1 = job.to.r * (cellSize + GAP) + cellSize / 2;
                job.item.g.x = x0 + (x1 - x0) * t;
                job.item.g.y = y0 + (y1 - y0) * t;
              }
            },
            easeInQuad,
          );
          await land(jobs.flatMap((job) => (job.item ? [job.item.g] : [])));
          break;
        }
        case "dropIn": {
          const jobs = event.drops.map((drop) => {
            const g = makeSprite(drop.tile, false);
            g.x = drop.to.c * (cellSize + GAP) + cellSize / 2;
            g.y = drop.fromR * (cellSize + GAP) + cellSize / 2;
            tileLayer.addChild(g);
            occupancy.set(posKey(drop.to), { g, tile: drop.tile });
            return {
              g,
              y0: g.y,
              y1: drop.to.r * (cellSize + GAP) + cellSize / 2,
            };
          });
          await animate(
            app,
            180,
            (t) => {
              for (const job of jobs) {
                job.g.y = job.y0 + (job.y1 - job.y0) * t;
              }
            },
            easeInQuad,
          );
          await land(jobs.map((job) => job.g));
          break;
        }
        default:
          break;
      }
      i += 1;
    }
  };

  const inputBlocked = () => busy || game.phase !== "idle";

  const applySwap = (a: Pos, b: Pos) => {
    if (inputBlocked()) return;
    selected = null;
    drag = null;
    const outcome = game.trySwap(a, b);
    const result = outcome.result;
    if (!result) {
      rebuild();
      return;
    }
    busy = true;
    void playEvents(result.events, result.cleared).finally(() => {
      selected = null;
      rebuild();
      hud.setChain(game.lastChain);
      hud.setCleared(game.totalCleared);
      hud.onResolved?.();
      busy = false;
    });
  };

  const finishDrag = (e: FederatedPointerEvent) => {
    if (inputBlocked() || !drag) return;
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
      return;
    }
    onTap(start.pos);
  };

  const onTap = (pos: Pos) => {
    if (inputBlocked()) return;
    if (!selected) {
      selected = pos;
      rebuild();
      return;
    }
    if (selected.r === pos.r && selected.c === pos.c) {
      selected = null;
      rebuild();
      return;
    }
    applySwap(selected, pos);
  };

  tileLayer.eventMode = "static";
  tileLayer.on("pointerdown", (e: FederatedPointerEvent) => {
    if (inputBlocked()) return;
    const pos = pickCell(e);
    if (!pos || !occupancy.has(posKey(pos))) return;
    drag = { pos, x: e.global.x, y: e.global.y };
  });

  app.stage.on("pointerup", finishDrag);
  app.stage.on("pointerupoutside", finishDrag);
  app.renderer.on("resize", () => {
    app.stage.hitArea = app.screen;
    if (!busy) rebuild();
  });
  rebuild();
  return { rebuild };
}

function burstColor(tile: Tile): number {
  if (tile.enraged) return 0xfb7185;
  if (tile.blocker) return 0xa8a29e;
  return PALETTE[tile.color] ?? 0xffffff;
}

function drawTile(g: Graphics, tile: Tile | null, size: number, selected: boolean): void {
  g.clear();
  if (tile?.enraged) {
    const hits = tile.hits ?? 1;
    g.roundRect(0, 0, size, size, 10).fill(hits <= 2 ? 0x7f1d1d : 0x9f1239);
    const cx = size / 2;
    const cy = size / 2;
    const s = size * 0.28;
    g.moveTo(cx, cy - s);
    g.lineTo(cx + s, cy);
    g.lineTo(cx, cy + s);
    g.lineTo(cx - s, cy);
    g.closePath();
    g.fill(0xfb7185);
    if (hits <= 3) {
      g.moveTo(size * 0.22, size * 0.28);
      g.lineTo(size * 0.78, size * 0.72);
      g.stroke({ width: 2, color: 0xfecdd3 });
    }
    if (hits <= 2) {
      g.moveTo(size * 0.78, size * 0.28);
      g.lineTo(size * 0.22, size * 0.72);
      g.stroke({ width: 2, color: 0xfecdd3 });
    }
    if (hits <= 1) {
      g.moveTo(size * 0.18, size * 0.5);
      g.lineTo(size * 0.82, size * 0.5);
      g.stroke({ width: 2, color: 0xfecdd3 });
    }
    if (selected) {
      g.roundRect(2, 2, size - 4, size - 4, 8).stroke({ width: 3, color: 0xffffff });
    }
    return;
  }
  if (tile?.blocker) {
    const hits = tile.hits ?? 1;
    const fill = hits >= 3 ? 0x57534e : hits === 2 ? 0x44403c : 0x292524;
    g.roundRect(0, 0, size, size, 10).fill(fill);
    const m = size * 0.22;
    g.roundRect(m, m, size - m * 2, size - m * 2, 4).stroke({ width: 2, color: 0xa8a29e });
    g.moveTo(size * 0.3, size * 0.55);
    g.lineTo(size * 0.48, size * 0.38);
    g.lineTo(size * 0.7, size * 0.62);
    g.stroke({ width: 2, color: 0x292524 });
    if (hits <= 2) {
      g.moveTo(size * 0.22, size * 0.28);
      g.lineTo(size * 0.78, size * 0.72);
      g.stroke({ width: 2, color: 0xd6d3d1 });
    }
    if (hits <= 1) {
      g.moveTo(size * 0.78, size * 0.28);
      g.lineTo(size * 0.22, size * 0.72);
      g.stroke({ width: 2, color: 0xd6d3d1 });
    }
    if (selected) {
      g.roundRect(2, 2, size - 4, size - 4, 8).stroke({ width: 3, color: 0xffffff });
    }
    return;
  }
  const color = tile ? (PALETTE[tile.color] ?? 0x52525b) : 0x27272a;
  g.roundRect(0, 0, size, size, 10).fill(color);
  if (selected) {
    g.roundRect(2, 2, size - 4, size - 4, 8).stroke({ width: 3, color: 0xffffff });
  }
  if (!tile || tile.special === "none") return;
  const cx = size / 2;
  const cy = size / 2;
  const mark = tile.plain ? 0.11 : 0.16;
  g.circle(cx, cy, size * mark).fill(0xffffff);
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
