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

const ANNUAL_DEPARTURE_CHANCE_BY_FORM = [0.8, 0.65, 0.5, 0.35, 0.25, 0.15, 0.1, 0.05] as const;

function getHighestFormLevel(forms: FormId[]): number {
  return forms.reduce((highest, formId) => {
    const match = /^form-(\d)/.exec(formId);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
}

function getDepartureChanceAtFormLevel(
  level: number,
  rarity: PersonRarity,
  foundedSchools: number,
): number {
  if (level >= 7) {
    return Math.round(clamp(
      GAME_CONFIG.formSevenDepartureChance[rarity] +
        Math.max(0, foundedSchools) * GAME_CONFIG.departureChancePerFoundedSchool,
      0,
      1,
    ) * 1_000) / 1_000;
  }
  return ANNUAL_DEPARTURE_CHANCE_BY_FORM[Math.max(0, level)];
}

function reduceDepartureChance(chance: number, riskReduction: number): number {
  return riskReduction > 0 ? Math.round(chance * (1 - riskReduction) * 1_000) / 1_000 : chance;
}

export function getMemberAnnualDepartureChance(
  forms: FormId[],
  rarity: PersonRarity = "common",
  foundedSchools = 0,
  /** Chat di Gruppo: share of the risk taken away (0–0,5). */
  riskReduction = 0,
): number {
  if (rarity === "legendary") return 0;
  return reduceDepartureChance(
    getDepartureChanceAtFormLevel(getHighestFormLevel(forms), rarity, foundedSchools),
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
  foundedSchools = 0,
  riskReduction = 0,
): number {
  // Only Comuni can still be at level 7 here, so their Forma 7 chance applies.
  const level = getHighestFormLevel(forms) - formsBack;
  return reduceDepartureChance(
    getDepartureChanceAtFormLevel(level, "common", foundedSchools),
    riskReduction,
  );
}
