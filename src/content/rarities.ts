import type { PersonRarity } from "../game/types";

export interface PersonRarityDefinition {
  id: PersonRarity;
  label: string;
  baseTrialBookingChance: number;
  baseEnrollmentChance: number;
  maxEnrollmentChance: number;
  queueAppearanceChance: number;
  collaboratorPath: "never" | "delayed" | "immediate";
  collaboratorDescription: string;
  collaboratorBadgeLabel?: string;
  collaboratorProductivityMultiplier: number;
}

export const PERSON_RARITIES: Record<PersonRarity, PersonRarityDefinition> = {
  common: {
    id: "common",
    label: "Comune",
    baseTrialBookingChance: 0.4,
    baseEnrollmentChance: 0.625,
    maxEnrollmentChance: 1,
    queueAppearanceChance: 0.8,
    collaboratorPath: "never",
    collaboratorDescription: "Non diventa collaboratore",
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
    collaboratorDescription: "Non diventa collaboratore",
    collaboratorProductivityMultiplier: 1,
  },
  "ultra-rare": {
    id: "ultra-rare",
    label: "Ultra Raro",
    baseTrialBookingChance: 0.75,
    baseEnrollmentChance: 7 / 30,
    maxEnrollmentChance: 0.5,
    queueAppearanceChance: 0.055,
    collaboratorPath: "delayed",
    collaboratorDescription: "Diventa collaboratore completando il Corso Y",
    collaboratorBadgeLabel: "Ultra Raro · Corso Y completato",
    collaboratorProductivityMultiplier: 1,
  },
  legendary: {
    id: "legendary",
    label: "Leggendario",
    baseTrialBookingChance: 1,
    baseEnrollmentChance: 0.15,
    maxEnrollmentChance: 0.35,
    queueAppearanceChance: 0.02,
    collaboratorPath: "immediate",
    collaboratorDescription: "Collaboratore dall'iscrizione",
    collaboratorBadgeLabel: "Collaboratore VIP",
    collaboratorProductivityMultiplier: 2,
  },
};

