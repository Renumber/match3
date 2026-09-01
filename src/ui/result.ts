export type ResultInfo = {
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  cleared: number;
  moves: number;
};

export type ResultUi = {
  show: (phase: "win" | "lose", info: ResultInfo) => void;
  hide: () => void;
};

export function mountResult(onRetry: () => void): ResultUi {
  const root = document.querySelector("#result");
  const kicker = document.querySelector("#result-kicker");
  const title = document.querySelector("#result-title");
  const detail = document.querySelector("#result-detail");
  const retry = document.querySelector("#result-retry");
  if (
    !(root instanceof HTMLElement) ||
    !(kicker instanceof HTMLElement) ||
    !(title instanceof HTMLElement) ||
    !(detail instanceof HTMLElement) ||
    !(retry instanceof HTMLButtonElement)
  ) {
    throw new Error("#result missing");
  }

  const hide = () => {
    root.classList.add("hidden");
    root.setAttribute("aria-hidden", "true");
  };

  retry.addEventListener("click", () => {
    hide();
    onRetry();
  });

  hide();
  return {
    hide,
    show: (phase, info) => {
      const win = phase === "win";
      root.dataset.phase = phase;
      kicker.textContent = info.bossName;
      title.textContent = win ? "클리어" : "실패";
      detail.textContent = win
        ? `지운 타일 ${info.cleared} · 남은 Moves ${info.moves}`
        : `남은 갑옷 ${info.bossHp}/${info.bossMaxHp} · 지운 타일 ${info.cleared}`;
      root.classList.remove("hidden");
      root.setAttribute("aria-hidden", "false");
    },
  };
}
