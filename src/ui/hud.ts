export type Hud = {
  setChain: (value: number) => void;
  setCleared: (value: number) => void;
  setMoves: (value: number) => void;
  setLevel: (value: number) => void;
  setXp: (current: number, next: number) => void;
  setBoss: (
    name: string,
    current: number,
    max: number,
    armor: number,
    armorMax: number,
  ) => void;
  setUpgrades: (items: { title: string; count: number }[]) => void;
};

function mustEl<T extends Element>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`${selector} missing`);
  return el as T;
}

export function mountHud(): Hud {
  const chainEl = mustEl("#chain");
  const clearedEl = mustEl("#cleared");
  const movesEl = mustEl("#moves");
  const levelEl = mustEl("#level");
  const xpLabel = mustEl("#xp-label");
  const xpFill = mustEl<HTMLElement>("#xp-fill");
  const upgradesEl = mustEl("#upgrades");
  const bossNameEl = mustEl("#boss-name");
  const bossArmorEl = mustEl<HTMLElement>("#boss-armor");
  const bossFill = mustEl<HTMLElement>("#boss-fill");
  const bossHpEl = mustEl("#boss-hp");

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
    setBoss: (name, current, max, armor, armorMax) => {
      bossNameEl.textContent = name;
      bossArmorEl.hidden = armorMax <= 0;
      bossArmorEl.textContent = armor > 0 ? `갑옷 ${armor}` : "깨짐";
      bossArmorEl.dataset.broken = armor > 0 ? "false" : "true";
      bossHpEl.textContent = `${current}/${max}`;
      const pct = max <= 0 ? 0 : Math.min(100, Math.round((current / max) * 100));
      bossFill.style.width = `${pct}%`;
    },
    setUpgrades: (items) => {
      upgradesEl.replaceChildren();
      for (const item of items) {
        const chip = document.createElement("span");
        chip.className = "upgrade-chip";
        chip.textContent = item.count > 1 ? `${item.title} ×${item.count}` : item.title;
        upgradesEl.append(chip);
      }
    },
  };
}
