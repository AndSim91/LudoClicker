import {
  getCreativityProgress,
  getUpgradeEffectTotal,
} from "../content/upgrades";
import type { AcquisitionEventDefinition } from "../content/events";
import { getCollaboratorBaseProductivity } from "../content/forms";
import { PERSON_RARITIES } from "../content/rarities";
import { GAME_CONFIG } from "./config";
import {
  getEventAttendanceBonus,
  getEventCharismaBonus,
  getEventCollaboratorMultiplier,
} from "./eventRewards";
import { getReputationMultiplier } from "./reputation";
import type { FormId, GameState, PersonRarity } from "./types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getEmailBookingChance(
  state: GameState,
  rarity: PersonRarity = "common",
) {
  const maximumChance: Record<PersonRarity, number> = {
    common: 0.85,
    rare: 0.9,
    "ultra-rare": 0.95,
    legendary: 1,
  };
  const progress = clamp(
    getCreativityProgress(state.upgrades),
    0,
    1,
  );
  // Reputation raises the base chance (+10% a point); the upgrades of the school
  // still close the gap to the maximum.
  const baseChance = Math.min(
    maximumChance[rarity],
    PERSON_RARITIES[rarity].baseTrialBookingChance,
  );
  return baseChance + (maximumChance[rarity] - baseChance) * progress;
}

export function getEnrollmentChance(
  state: GameState,
  rarity: PersonRarity = "common",
  previousFailures = 0,
) {
  const instructorProductivity = state.collaborators
    .filter((collaborator) => collaborator.assignment === "instructor")
    .reduce((total, collaborator) => total + getCollaboratorBaseProductivity(collaborator), 0);
  const instructorEffectiveness = 1 + getUpgradeEffectTotal(
    state.upgrades,
    "instructorEnrollmentEffectiveness",
  );
  const improvementProgress = clamp(
    getUpgradeEffectTotal(state.upgrades, "enrollmentProgress") +
      instructorProductivity * 0.1 * instructorEffectiveness,
    0,
    1,
  );
  const failureBonus = rarity === "legendary"
    ? previousFailures * GAME_CONFIG.legendaryEnrollmentChancePerFailure
    : 0;
  const definition = PERSON_RARITIES[rarity];
  const baseChance = Math.min(
    definition.maxEnrollmentChance,
    definition.baseEnrollmentChance * getReputationMultiplier(state, "enrollment"),
  );
  const improvedChance = baseChance +
    (definition.maxEnrollmentChance - baseChance) * improvementProgress;
  return clamp(
    improvedChance + failureBonus,
    baseChance,
    definition.maxEnrollmentChance,
  );
}

export function getEventFunnelOutcome(
  state: GameState,
  definition: AcquisitionEventDefinition,
  attendanceVariance = 1,
) {
  const charismaMultiplier = 1 + getEventCharismaBonus(state);
  const collaboratorMultiplier = getEventCollaboratorMultiplier(state);
  const attendanceMultiplier = 1 + getEventAttendanceBonus(state);
  const peopleMet = Math.max(
    1,
    Math.round(
      definition.baseAttendance *
        attendanceVariance *
        attendanceMultiplier *
        collaboratorMultiplier,
    ),
  );
  const demonstrationsGiven = Math.max(
    1,
    Math.round(peopleMet * definition.demonstrationRate * charismaMultiplier),
  );
  const emailShareChance = clamp(
    definition.contactRate * charismaMultiplier * collaboratorMultiplier,
    0,
    1,
  );
  return { peopleMet, demonstrationsGiven, emailShareChance };
}

export function getWritingPower(state: GameState) {
  const localPower = 1 + getUpgradeEffectTotal(state.upgrades, "writingPower");
  return localPower * getReputationMultiplier(state, "writing");
}

export function getHighestFormLevel(forms: FormId[]): number {
  return forms.reduce((highest, formId) => {
    const match = /^form-(\d)/.exec(formId);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
}

function getDepartureChanceAtFormLevel(level: number, rarity: PersonRarity): number {
  const table = GAME_CONFIG.annualDepartureChanceByForm;
  // 14/10/2026: no more +0,5% per founded school at Forma 7.
  return roundChance(clamp(table[clamp(level, 0, table.length - 1)] - GAME_CONFIG.rarityDepartureDiscount[rarity], 0, 1));
}

/** To the hundredth of a percent: 1,25% stays 1,25% (14/10/2026). */
function roundChance(chance: number): number {
  return Math.round(chance * 10_000) / 10_000;
}

function reduceDepartureChance(chance: number, riskReduction: number): number {
  return riskReduction > 0 ? roundChance(chance * (1 - riskReduction)) : chance;
}

export function getMemberAnnualDepartureChance(
  forms: FormId[],
  rarity: PersonRarity = "common",
  /** Chat di Gruppo and the course of the year: share of the risk taken away. */
  riskReduction = 0,
): number {
  if (rarity === "legendary") return 0;
  return reduceDepartureChance(
    getDepartureChanceAtFormLevel(getHighestFormLevel(forms), rarity),
    riskReduction,
  );
}

/**
 * Departure risk used only to order automatic teaching (decision of 13/10/2026):
 * rarity counts as Forms missing, so rarer athletes rank as more at risk.
 * `formsBack`: 1 Raro, 2 Ultra Raro (a Raro with Forma 6 counts as Forma 5: 15%
 * instead of 10%). Leggendari are immune collaborators: their risk stays 0.
 */
export function getTeachingPriorityDepartureChance(
  forms: FormId[],
  formsBack: number,
  riskReduction = 0,
): number {
  // Only Comuni can still be at level 7 here, so their Forma 7 chance applies.
  const level = getHighestFormLevel(forms) - formsBack;
  return reduceDepartureChance(
    getDepartureChanceAtFormLevel(level, "common"),
    riskReduction,
  );
}
