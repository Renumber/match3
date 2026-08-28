import { UPGRADE_TAG_LABEL, type LevelUpCard } from "../data/levelUpCards.ts";

export type LevelUpUi = {
  show: (cards: LevelUpCard[]) => void;
  hide: () => void;
};

export function mountLevelUp(onPick: (cardId: string) => void): LevelUpUi {
  const root = document.querySelector("#levelup");
  const list = document.querySelector("#levelup-cards");
  if (!(root instanceof HTMLElement) || !(list instanceof HTMLElement)) {
    throw new Error("#levelup missing");
  }

  const hide = () => {
    root.classList.add("hidden");
    root.setAttribute("aria-hidden", "true");
    list.replaceChildren();
  };

  const show = (cards: LevelUpCard[]) => {
    list.replaceChildren();
    for (const card of cards) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "levelup-card";
      button.dataset.cardId = card.id;

      const title = document.createElement("strong");
      title.textContent = card.title;
      const desc = document.createElement("span");
      desc.textContent = card.description;
      const tags = document.createElement("div");
      tags.className = "levelup-tags";
      for (const tag of card.tags) {
        const chip = document.createElement("em");
        chip.className = "levelup-tag";
        chip.dataset.tag = tag;
        chip.textContent = UPGRADE_TAG_LABEL[tag];
        tags.append(chip);
      }
      button.append(title, desc, tags);
      button.addEventListener("click", () => onPick(card.id));
      list.append(button);
    }
    root.classList.remove("hidden");
    root.setAttribute("aria-hidden", "false");
  };

  hide();
  return { show, hide };
}
