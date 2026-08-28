import { Application, Container, Graphics } from "pixi.js";
import { COLS, ROWS, type Pos } from "../engine/types.ts";
import { animate, easeOutCubic } from "./tween.ts";

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
  await animate(app, 160, (t) => {
    fx.clear();
    const alpha = 1 - t;
    if (dir === "h") {
      const y = index * (cell + gap) + cell / 2;
      const w = boardW * Math.min(1, t * 1.4);
      fx.rect(0, y - 3, w, 6).fill({ color: 0xfff7ed, alpha });
    } else {
      const x = index * (cell + gap) + cell / 2;
      const h = boardH * Math.min(1, t * 1.4);
      fx.rect(x - 3, 0, 6, h).fill({ color: 0xfff7ed, alpha });
    }
  });
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
  const maxR = layout.cell * 1.8;
  await animate(
    app,
    200,
    (t) => {
      fx.clear();
      fx.circle(origin.x, origin.y, Math.max(1, maxR * t)).stroke({
        width: 5 * (1 - t) + 2,
        color: 0xfbbf24,
        alpha: 1 - t,
      });
      fx.circle(origin.x, origin.y, Math.max(1, maxR * t * 0.55)).fill({
        color: 0xf97316,
        alpha: 0.28 * (1 - t),
      });
    },
    easeOutCubic,
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
  await animate(app, 140, (t) => {
    fx.clear();
    const alpha = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
    fx.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({
      width: 4,
      color: 0xfde047,
      alpha,
    });
    fx.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({
      width: 1.5,
      color: 0xffffff,
      alpha,
    });
  });
  fx.destroy();
}
