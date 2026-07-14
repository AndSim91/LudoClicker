import type { PersonRarity } from "../game/types";

export interface PersonRarityDefinition {
  id: PersonRarity;
  label: string;
  emailShareChance: number;
  baseEnrollmentChance: number;
  queueAppearanceChance: number;
  collaboratorPath: "never" | "delayed" | "immediate";
  collaboratorProductivityMultiplier: number;
}

export const PERSON_RARITIES: Record<PersonRarity, PersonRarityDefinition> = {
  common: {
    id: "common",
    label: "Comune",
    emailShareChance: 0.7,
    baseEnrollmentChance: 0.4,
    queueAppearanceChance: 0.95,
    collaboratorPath: "never",
    collaboratorProductivityMultiplier: 0,
  },
  rare: {
    id: "rare",
    label: "Raro",
    emailShareChance: 0.85,
    baseEnrollmentChance: 0.55,
    queueAppearanceChance: 0.1,
    collaboratorPath: "delayed",
    collaboratorProductivityMultiplier: 1,
  },
  legendary: {
    id: "legendary",
    label: "Leggendario",
    emailShareChance: 1,
    baseEnrollmentChance: 0.025,
    queueAppearanceChance: 0.05,
    collaboratorPath: "immediate",
    collaboratorProductivityMultiplier: 2,
  },
};

