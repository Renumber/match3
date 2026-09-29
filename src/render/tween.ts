import { Application, Ticker } from "pixi.js";

export function linear(t: number): number {
  return t;
}

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export function swapTravel(t: number): number {
  const wind = 0.22;
  const pull = 0.14;
  if (t <= wind) return -pull * (t / wind);
  const u = (t - wind) / (1 - wind);
  return -pull + (1 + pull) * easeOutBack(u);
}

export function animate(
  app: Application,
  ms: number,
  update: (t: number) => void,
  ease: (t: number) => number = easeOutCubic,
): Promise<void> {
  if (ms <= 0) {
    update(1);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let elapsed = 0;
    const tick = (ticker: Ticker) => {
      elapsed += ticker.deltaMS;
      const t = Math.min(1, elapsed / ms);
      update(ease(t));
      if (t >= 1) {
        app.ticker.remove(tick);
        resolve();
      }
    };
    app.ticker.add(tick);
  });
}
