import type { UpgradeId, UpgradeLevels } from "../game/types";

export type UpgradeCategory = "speed" | "charisma" | "writing" | "welcome";
export type UpgradeEffect =
  | "writingPower"
  | "eventContactsMultiplier"
  | "bookingMultiplier"
  | "enrollmentMultiplier";

export interface UpgradeDefinition {
  id: UpgradeId;
  category: UpgradeCategory;
  title: string;
  description: string;
  effectLabel: string;
  effect: UpgradeEffect;
  effectPerLevel: number;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
  requiredHistoricMembers: number;
}

export const UPGRADE_CATEGORIES: Array<{
  id: UpgradeCategory;
  title: string;
  description: string;
}> = [
  {
    id: "speed",
    title: "Velocità di scrittura",
    description: "Aumenta i caratteri prodotti da input manuale e automazione.",
  },
  {
    id: "charisma",
    title: "Carisma",
    description: "Migliora la raccolta di contatti durante eventi e sparring.",
  },
  {
    id: "writing",
    title: "Scrittura",
    description: "Aumenta la probabilità che una mail generi una prova in palestra.",
  },
  {
    id: "welcome",
    title: "Accoglienza",
    description: "Migliora la conversione da lezione di prova a nuovo iscritto.",
  },
];

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: "comfortable-keyboard",
    category: "speed",
    title: "Tastiera comoda",
    description: "Una postazione più efficace rende ogni pressione più produttiva.",
    effectLabel: "+1 carattere per input e livello",
    effect: "writingPower",
    effectPerLevel: 1,
    baseCost: 20,
    costGrowth: 1.2,
    maxLevel: 5,
    requiredHistoricMembers: 0,
  },
  {
    id: "prepared-presentation",
    category: "charisma",
    title: "Presentazione preparata",
    description: "Spiegazioni più chiare trasformano più incontri in contatti utili.",
    effectLabel: "+10% contatti dagli eventi per livello",
    effect: "eventContactsMultiplier",
    effectPerLevel: 0.1,
    baseCost: 15,
    costGrowth: 1.2,
    maxLevel: 5,
    requiredHistoricMembers: 0,
  },
  {
    id: "clear-subject",
    category: "writing",
    title: "Oggetto chiaro",
    description: "Un invito immediatamente comprensibile riceve più conferme.",
    effectLabel: "+8% probabilità di prenotazione per livello",
    effect: "bookingMultiplier",
    effectPerLevel: 0.08,
    baseCost: 25,
    costGrowth: 1.2,
    maxLevel: 5,
    requiredHistoricMembers: 0,
  },
  {
    id: "welcome-procedure",
    category: "welcome",
    title: "Procedura di benvenuto",
    description: "Una prima lezione più curata facilita l'ingresso nel gruppo.",
    effectLabel: "+10% probabilità di iscrizione per livello",
    effect: "enrollmentMultiplier",
    effectPerLevel: 0.1,
    baseCost: 30,
    costGrowth: 1.2,
    maxLevel: 5,
    requiredHistoricMembers: 0,
  },
];

export function createInitialUpgradeLevels(): UpgradeLevels {
  return {
    "comfortable-keyboard": 0,
    "prepared-presentation": 0,
    "clear-subject": 0,
    "welcome-procedure": 0,
  };
}

export function getUpgradeDefinition(id: UpgradeId) {
  return UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id);
}

export function getUpgradeCost(definition: UpgradeDefinition, currentLevel: number) {
  return Math.round(definition.baseCost * definition.costGrowth ** currentLevel);
}

export function getUpgradeEffectTotal(
  levels: UpgradeLevels,
  effect: UpgradeEffect,
): number {
  return UPGRADE_DEFINITIONS.reduce((total, definition) => {
    if (definition.effect !== effect) return total;
    return total + levels[definition.id] * definition.effectPerLevel;
  }, 0);
}
