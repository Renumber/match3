export type Hud = {
  setChain: (value: number) => void;
  setCleared: (value: number) => void;
  setMoves: (value: number) => void;
  setLevel: (value: number) => void;
  setXp: (current: number, next: number) => void;
  setBoss: (name: string, current: number, max: number, lateAt: number, late: boolean) => void;
};

function mustEl<T extends Element>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`${selector} missing`);
  return el as T;
}

function ensurePips(root: HTMLElement, max: number, lateAt: number): void {
  if (root.dataset.max === String(max) && root.dataset.lateAt === String(lateAt)) return;
  root.dataset.max = String(max);
  root.dataset.lateAt = String(lateAt);
  root.replaceChildren();
  const earlyMax = Math.max(0, max - Math.min(lateAt, max));
  const lateMax = Math.min(lateAt, max);
  const early = document.createElement("span");
  early.className = "boss-pips-early";
  for (let i = 0; i < earlyMax; i++) {
    const pip = document.createElement("i");
    pip.className = "boss-pip";
    pip.dataset.zone = "early";
    early.append(pip);
  }
  const late = document.createElement("span");
  late.className = "boss-pips-late";
  for (let i = 0; i < lateMax; i++) {
    const pip = document.createElement("i");
    pip.className = "boss-pip";
    pip.dataset.zone = "late";
    late.append(pip);
  }
  if (earlyMax) root.append(early);
  if (lateMax) root.append(late);
}

function paintPips(root: HTMLElement, current: number, max: number, lateAt: number): void {
  const cap = Math.min(lateAt, max);
  const earlyOn = Math.max(0, Math.min(max - cap, current - cap));
  const lateOn = Math.max(0, Math.min(cap, current));
  const earlyPips = root.querySelectorAll<HTMLElement>('.boss-pip[data-zone="early"]');
  const latePips = root.querySelectorAll<HTMLElement>('.boss-pip[data-zone="late"]');
  earlyPips.forEach((pip, i) => {
    pip.dataset.on = i < earlyOn ? "true" : "false";
  });
  latePips.forEach((pip, i) => {
    pip.dataset.on = i < lateOn ? "true" : "false";
  });
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
  const bossPipsEl = mustEl<HTMLElement>("#boss-pips");

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
    setBoss: (name, current, max, lateAt, late) => {
      bossNameEl.textContent = name;
      bossPhaseEl.hidden = !late;
      ensurePips(bossPipsEl, max, lateAt);
      paintPips(bossPipsEl, current, max, lateAt);
    },
  };
}
