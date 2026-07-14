import type { PersonRarity } from "../game/types";

export interface PersonRarityDefinition {
  id: PersonRarity;
  label: string;
  emailShareChance: number;
  baseEnrollmentChance: number;
  queueAppearanceChance: number;
}

export const PERSON_RARITIES: Record<PersonRarity, PersonRarityDefinition> = {
  common: {
    id: "common",
    label: "Comune",
    emailShareChance: 0.7,
    baseEnrollmentChance: 0.4,
    queueAppearanceChance: 0.95,
  },
  legendary: {
    id: "legendary",
    label: "Leggendario",
    emailShareChance: 1,
    baseEnrollmentChance: 0.025,
    queueAppearanceChance: 0.05,
  },
};

