import type { PersonRarity } from "../game/types";

export interface PersonRarityDefinition {
  id: PersonRarity;
  label: string;
  baseTrialBookingChance: number;
  baseEnrollmentChance: number;
  maxEnrollmentChance: number;
  queueAppearanceChance: number;
  collaboratorPath: "never" | "delayed" | "immediate";
  collaboratorProductivityMultiplier: number;
}

export const PERSON_RARITIES: Record<PersonRarity, PersonRarityDefinition> = {
  common: {
    id: "common",
    label: "Comune",
    baseTrialBookingChance: 0.3,
    baseEnrollmentChance: 0.5,
    maxEnrollmentChance: 1,
    queueAppearanceChance: 0.8,
    collaboratorPath: "never",
    collaboratorProductivityMultiplier: 0,
  },
  rare: {
    id: "rare",
    label: "Raro",
    baseTrialBookingChance: 0.5,
    baseEnrollmentChance: 0.4,
    maxEnrollmentChance: 0.9,
    queueAppearanceChance: 0.125,
    collaboratorPath: "never",
    collaboratorProductivityMultiplier: 1,
  },
  "ultra-rare": {
    id: "ultra-rare",
    label: "Ultra Raro",
    baseTrialBookingChance: 0.75,
    baseEnrollmentChance: 0.3,
    maxEnrollmentChance: 0.5,
    queueAppearanceChance: 0.055,
    collaboratorPath: "delayed",
    collaboratorProductivityMultiplier: 1,
  },
  legendary: {
    id: "legendary",
    label: "Leggendario",
    baseTrialBookingChance: 1,
    baseEnrollmentChance: 0.2,
    maxEnrollmentChance: 0.35,
    queueAppearanceChance: 0.02,
    collaboratorPath: "immediate",
    collaboratorProductivityMultiplier: 2,
  },
};

