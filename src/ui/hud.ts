export type BossHud = {
  name: string;
  current: number;
  max: number;
  lateAt: number;
  late: boolean;
  earlyColor?: string;
  lateColor?: string;
};

export type Hud = {
  setChain: (value: number) => void;
  setCleared: (value: number) => void;
  setMoves: (value: number) => void;
  setLevel: (value: number) => void;
  setXp: (current: number, next: number) => void;
  setBoss: (info: BossHud) => void;
};

function mustEl<T extends Element>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`${selector} missing`);
  return el as T;
}

function ensureTicks(root: HTMLElement, max: number, lateAt: number): void {
  if (root.dataset.max === String(max) && root.dataset.lateAt === String(lateAt)) return;
  root.dataset.max = String(max);
  root.dataset.lateAt = String(lateAt);
  root.replaceChildren();
  for (let i = 1; i < max; i++) {
    const tick = document.createElement("i");
    tick.className = "boss-tick";
    if (lateAt > 0 && i === lateAt) tick.dataset.boundary = "true";
    tick.style.left = `${(i / max) * 100}%`;
    root.append(tick);
  }
}

export function mountHud(): Hud {
  const chainEl = mustEl("#chain");
  const clearedEl = mustEl("#cleared");
  const movesEl = mustEl("#moves");
  const levelEl = mustEl("#level");
  const xpLabel = mustEl("#xp-label");
  const xpFill = mustEl<HTMLElement>("#xp-fill");
  const bossNameEl = mustEl("#boss-name");
  const bossPhaseEl = mustEl<HTMLElement>("#boss-phase");
  const bossBarEl = mustEl<HTMLElement>("#boss-bar");
  const bossFillLateEl = mustEl<HTMLElement>("#boss-fill-late");
  const bossFillEarlyEl = mustEl<HTMLElement>("#boss-fill-early");
  const bossTicksEl = mustEl<HTMLElement>("#boss-ticks");

  return {
    setChain: (value) => {
      chainEl.textContent = String(value);
    },
    setCleared: (value) => {
      clearedEl.textContent = String(value);
    },
    setMoves: (value) => {
      movesEl.textContent = String(value);
    },
    setLevel: (value) => {
      levelEl.textContent = String(value);
    },
    setXp: (current, next) => {
      xpLabel.textContent = `${current}/${next}`;
      const pct = next <= 0 ? 0 : Math.min(100, Math.round((current / next) * 100));
      xpFill.style.width = `${pct}%`;
    },
    setBoss: (info) => {
      bossNameEl.textContent = info.name;
      bossPhaseEl.hidden = !info.late;
      const max = Math.max(0, info.max);
      const hp = Math.max(0, Math.min(info.current, max));
      const lateAt = Math.max(0, Math.min(info.lateAt, max));
      const hpFrac = max <= 0 ? 0 : hp / max;
      const lateFrac = max <= 0 || lateAt <= 0 ? 0 : lateAt / max;
      const lateW = Math.min(hpFrac, lateFrac) * 100;
      const earlyW = Math.max(0, hpFrac - lateFrac) * 100;
      bossBarEl.style.setProperty("--boss-early", info.earlyColor ?? "#fbbf24");
      bossBarEl.style.setProperty("--boss-late", info.lateColor ?? "#e11d48");
      bossFillLateEl.style.width = `${lateW}%`;
      bossFillEarlyEl.style.left = `${lateFrac * 100}%`;
      bossFillEarlyEl.style.width = `${earlyW}%`;
      ensureTicks(bossTicksEl, max, lateAt);
    },
  };
}
