import { PERSON_RARITIES } from "../../content/rarities";
import type { PersonRarity } from "../../game/types";
import {
  getPresentedPersonRarity,
  getPresentedRarityLabel,
  getRarityClassName,
} from "../../shared/rarityPresentation";

/** Rarity chips of the filter drawers (Tavola 12, F3). */
export const RARITY_FILTER_VALUES = [...Object.keys(PERSON_RARITIES), "secret-legendary"];

export function rarityFilterLabel(value: string): string {
  return value === "secret-legendary"
    ? getPresentedRarityLabel("legendary", true)
    : PERSON_RARITIES[value as PersonRarity]?.label ?? value;
}

export function rarityFilterClassName(value: string): string {
  return value === "secret-legendary"
    ? getRarityClassName("legendary", true)
    : getRarityClassName(value as PersonRarity, false);
}

/** «Leggendario» includes the secret ones, like the Istruttori panel always did. */
export function matchesRarityFilter(selected: readonly string[], rarity: PersonRarity, secret: boolean): boolean {
  if (selected.length === 0) return true;
  const presented = getPresentedPersonRarity(rarity, secret);
  return selected.includes(presented) || (presented === "secret-legendary" && selected.includes("legendary"));
}

