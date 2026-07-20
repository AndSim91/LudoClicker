import type { PersonRarity } from "../game/types";

export type PresentedPersonRarity = PersonRarity | "secret-legendary";

export function getPresentedPersonRarity(
  rarity: PersonRarity,
  secretLegendary = false,
): PresentedPersonRarity {
  return secretLegendary ? "secret-legendary" : rarity;
}

export function getRarityClassName(
  rarity: PersonRarity,
  secretLegendary = false,
): string {
  return `rarity-${getPresentedPersonRarity(rarity, secretLegendary)}`;
}
