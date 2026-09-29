import { Application, Container, Graphics } from "pixi.js";
import { COLS, ROWS, type Pos } from "../engine/types.ts";
import { animate, easeOutCubic, linear } from "./tween.ts";

export type Layout = {
  cell: number;
  gap: number;
};

function cellCenter(layout: Layout, r: number, c: number): { x: number; y: number } {
  return {
    x: c * (layout.cell + layout.gap) + layout.cell / 2,
    y: r * (layout.cell + layout.gap) + layout.cell / 2,
  };
}

export async function playLineFx(
  app: Application,
  parent: Container,
  layout: Layout,
  dir: "h" | "v",
  index: number,
): Promise<void> {
  const fx = new Graphics();
  parent.addChild(fx);
  const { cell, gap } = layout;
  const boardW = cell * COLS + gap * (COLS - 1);
  const boardH = cell * ROWS + gap * (ROWS - 1);
  await animate(
    app,
    170,
    (t) => {
      fx.clear();
      const sweep = Math.min(1, t / 0.38);
      const fade = t < 0.38 ? 1 : 1 - (t - 0.38) / 0.62;
      if (dir === "h") {
        const y = index * (cell + gap) + cell / 2;
        const w = boardW * sweep;
        fx.rect(0, y - 11, w, 22).fill({ color: 0xfff7ed, alpha: 0.28 * fade });
        fx.rect(0, y - 3, w, 6).fill({ color: 0xffffff, alpha: fade });
      } else {
        const x = index * (cell + gap) + cell / 2;
        const h = boardH * sweep;
        fx.rect(x - 11, 0, 22, h).fill({ color: 0xfff7ed, alpha: 0.28 * fade });
        fx.rect(x - 3, 0, 6, h).fill({ color: 0xffffff, alpha: fade });
      }
    },
    linear,
  );
  fx.destroy();
}

export async function playBombFx(
  app: Application,
  parent: Container,
  layout: Layout,
  at: Pos,
): Promise<void> {
  const fx = new Graphics();
  parent.addChild(fx);
  const origin = cellCenter(layout, at.r, at.c);
  const maxR = layout.cell * 2.5;
  await animate(
    app,
    220,
    (t) => {
      fx.clear();
      const fade = 1 - t;
      const ring = Math.max(1, maxR * easeOutCubic(t));
      const core = layout.cell * (0.55 + 0.35 * (1 - Math.min(1, t * 2)));
      fx.circle(origin.x, origin.y, ring * 0.72).fill({
        color: 0xf97316,
        alpha: 0.4 * fade,
      });
      fx.circle(origin.x, origin.y, core).fill({
        color: 0xffffff,
        alpha: 0.95 * (1 - Math.min(1, t * 2.4)),
      });
      fx.circle(origin.x, origin.y, ring).stroke({
        width: 7 * fade + 1.5,
        color: 0xfde047,
        alpha: fade,
      });
      if (t > 0.12) {
        const u = (t - 0.12) / 0.88;
        fx.circle(origin.x, origin.y, Math.max(1, ring * 0.72 * easeOutCubic(u))).stroke({
          width: 3 * (1 - u),
          color: 0xffffff,
          alpha: 0.8 * (1 - u),
        });
      }
    },
    linear,
  );
  fx.destroy();
}

export async function playStrikeFx(
  app: Application,
  parent: Container,
  layout: Layout,
  from: Pos,
  to: Pos,
): Promise<void> {
  const fx = new Graphics();
  parent.addChild(fx);
  const a = cellCenter(layout, from.r, from.c);
  const b = cellCenter(layout, to.r, to.c);
  await animate(
    app,
    150,
    (t) => {
      fx.clear();
      const alpha = t < 0.28 ? t / 0.28 : 1 - (t - 0.28) / 0.72;
      const bolt = 6 * (1 - t * 0.35);
      fx.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({
        width: bolt + 6,
        color: 0xfde047,
        alpha: alpha * 0.35,
      });
      fx.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({
        width: bolt,
        color: 0xfde047,
        alpha,
      });
      fx.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({
        width: 2,
        color: 0xffffff,
        alpha,
      });
      const impact = layout.cell * (0.2 + 0.55 * Math.min(1, t * 1.6));
      fx.circle(b.x, b.y, Math.max(1, impact)).fill({
        color: 0xffffff,
        alpha: alpha * 0.9,
      });
    },
    linear,
  );
  fx.destroy();
}

export async function playClearBurst(
  app: Application,
  parent: Container,
  points: { x: number; y: number; color: number }[],
  cell: number,
): Promise<void> {
  if (points.length === 0) return;
  const fx = new Graphics();
  parent.addChild(fx);
  const shards = points.flatMap((point, index) => {
    const count = 6;
    return Array.from({ length: count }, (_, i) => {
      const ang = (Math.PI * 2 * i) / count + index * 0.41;
      return {
        x: point.x,
        y: point.y,
        ang,
        dist: cell * (0.62 + ((i * 3 + index) % 5) * 0.1),
        size: cell * (0.09 + (i % 3) * 0.03),
        color: i % 3 === 0 ? 0xffffff : point.color,
      };
    });
  });
  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const maxR = cell * (1.05 + Math.min(1.5, points.length * 0.14));
  await animate(
    app,
    200,
    (t) => {
      fx.clear();
      const fade = 1 - t;
      const ring = maxR * (0.15 + 0.85 * easeOutCubic(t));
      fx.circle(cx, cy, Math.max(1, ring)).stroke({
        width: Math.max(1.5, 6 * fade),
        color: 0xffffff,
        alpha: 0.9 * fade,
      });
      for (const shard of shards) {
        const d = shard.dist * easeOutCubic(t);
        const x = shard.x + Math.cos(shard.ang) * d;
        const y = shard.y + Math.sin(shard.ang) * d + cell * 0.18 * t * t;
        const w = shard.size * (1 - t * 0.25);
        fx.roundRect(x - w / 2, y - w / 2, w, w, 2).fill({ color: shard.color, alpha: fade });
      }
    },
    linear,
  );
  fx.destroy();
}
