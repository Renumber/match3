import { LEVEL_UP_CARDS, UPGRADE_TAG_LABEL, type LevelUpCard } from "../data/levelUpCards.ts";
import {
  affinityRows,
  effectLines,
  offerWeightRows,
  ownedCardRows,
  runStatRows,
  spawnRuleRows,
  threeMatchKindRows,
  type InfoRow,
} from "../engine/upgradeInfo.ts";
import type { UpgradeStats } from "../engine/upgradeStats.ts";

export type CodexSource = {
  ownedIds: () => string[];
  stats: () => UpgradeStats;
};

export type CodexUi = {
  open: (tab?: "cards" | "run") => void;
  close: () => void;
};

function mustEl<T extends Element>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`${selector} missing`);
  return el as T;
}

function renderRows(title: string, rows: InfoRow[]): HTMLElement {
  const section = document.createElement("section");
  section.className = "codex-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const list = document.createElement("dl");
  list.className = "codex-rows";
  for (const row of rows) {
    const dt = document.createElement("dt");
    dt.textContent = row.label;
    const dd = document.createElement("dd");
    dd.textContent = row.value;
    list.append(dt, dd);
  }
  section.append(heading, list);
  return section;
}

function renderCard(card: LevelUpCard, owned: number): HTMLElement {
  const article = document.createElement("article");
  article.className = "codex-card";
  article.dataset.rarity = card.rarity;
  if (card.core) article.dataset.core = "true";
  if (owned) article.dataset.owned = "true";

  const head = document.createElement("div");
  head.className = "codex-card-head";
  const title = document.createElement("strong");
  title.textContent = card.title;
  head.append(title);
  if (card.tags.length) {
    const chips = document.createElement("div");
    chips.className = "levelup-tags";
    for (const tag of card.tags) {
      const chip = document.createElement("em");
      chip.className = "levelup-tag";
      chip.dataset.tag = tag;
      chip.textContent = UPGRADE_TAG_LABEL[tag];
      chips.append(chip);
    }
    head.append(chips);
  }

  const meta = document.createElement("p");
  meta.className = "codex-meta";
  const bits = [card.stackable ? "중첩" : "1회"];
  if (owned) bits.push(`보유 ×${owned}`);
  meta.textContent = bits.join(" · ");

  const desc = document.createElement("p");
  desc.className = "codex-desc";
  desc.textContent = card.description;

  const details = document.createElement("ul");
  details.className = "codex-details";
  for (const line of effectLines(card.effect)) {
    const item = document.createElement("li");
    item.textContent = line;
    details.append(item);
  }

  article.append(head, meta, desc, details);
  return article;
}

export function mountCodex(source: CodexSource): CodexUi {
  const root = mustEl<HTMLElement>("#codex");
  const cardsEl = mustEl<HTMLElement>("#codex-cards");
  const runEl = mustEl<HTMLElement>("#codex-run");
  const titleEl = mustEl<HTMLElement>("#codex-title");
  const panel = mustEl<HTMLElement>(".codex-panel");
  const tabs = root.querySelectorAll<HTMLButtonElement>("[data-codex-tab]");

  const setTab = (tab: "cards" | "run") => {
    const showCards = tab === "cards";
    cardsEl.classList.toggle("hidden", !showCards);
    runEl.classList.toggle("hidden", showCards);
    titleEl.textContent = showCards ? "도감" : "상태";
    for (const button of tabs) {
      button.classList.toggle("active", button.dataset.codexTab === tab);
    }
    panel.scrollTop = 0;
  };

  const render = () => {
    const ownedIds = source.ownedIds();
    const counts = new Map<string, number>();
    for (const id of ownedIds) counts.set(id, (counts.get(id) ?? 0) + 1);

    cardsEl.replaceChildren();
    for (const card of LEVEL_UP_CARDS) {
      cardsEl.append(renderCard(card, counts.get(card.id) ?? 0));
    }

    runEl.replaceChildren(
      renderRows("보유 카드", ownedCardRows(ownedIds)),
      renderRows("이번 런", runStatRows(source.stats())),
      renderRows("특수 생성", spawnRuleRows()),
      renderRows("3매치 특수 종류 (특수 생성 성공 시)", threeMatchKindRows()),
      renderRows("태그 친화도", affinityRows(ownedIds)),
      renderRows("다음 3택 가중", offerWeightRows(ownedIds, source.stats())),
    );
  };

  const close = () => {
    root.classList.add("hidden");
    root.setAttribute("aria-hidden", "true");
  };

  const open = (tab: "cards" | "run" = "cards") => {
    render();
    setTab(tab);
    root.classList.remove("hidden");
    root.setAttribute("aria-hidden", "false");
  };

  for (const button of tabs) {
    button.addEventListener("click", () => {
      const tab = button.dataset.codexTab === "run" ? "run" : "cards";
      setTab(tab);
    });
  }

  mustEl("#codex-open").addEventListener("click", () => open("cards"));
  mustEl("#codex-stats").addEventListener("click", () => open("run"));
  mustEl("#codex-close").addEventListener("click", close);
  root.addEventListener("click", (event) => {
    if (event.target === root) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !root.classList.contains("hidden")) close();
  });

  close();
  return { open, close };
}
