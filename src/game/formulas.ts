import { getUpgradeEffectMaximum, getUpgradeEffectTotal } from "../content/upgrades";
import type { AcquisitionEventDefinition } from "../content/events";
import { getCollaboratorBaseProductivity } from "../content/forms";
import { PERSON_RARITIES } from "../content/rarities";
import { GAME_CONFIG } from "./config";
import {
  getEventAttendanceBonus,
  getEventCharismaBonus,
  getEventCollaboratorBonus,
} from "./eventRewards";
import type { FormId, GameState, PersonRarity } from "./types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getEmailBookingChance(
  state: GameState,
  rarity: PersonRarity = "common",
) {
  const specializationBonus = state.school.specialization === "accoglienza" ? 0.1 : 0;
  const multiplier = 1 + getUpgradeEffectTotal(state.upgrades, "bookingMultiplier") + specializationBonus;
  return clamp(PERSON_RARITIES[rarity].baseTrialBookingChance * multiplier, 0.01, 1);
}

export function getEnrollmentChance(
  state: GameState,
  rarity: PersonRarity = "common",
  previousFailures = 0,
) {
  const instructorProductivity = state.collaborators
    .filter((collaborator) => collaborator.assignment === "instructor")
    .reduce((total, collaborator) => total + getCollaboratorBaseProductivity(collaborator), 0);
  const maximumUpgradeEffect = getUpgradeEffectMaximum("enrollmentMultiplier");
  const improvementProgress = clamp(
    (
      getUpgradeEffectTotal(state.upgrades, "enrollmentMultiplier") +
      instructorProductivity * 0.1 +
      (state.school.specialization === "accoglienza" ? 0.1 : 0)
    ) / maximumUpgradeEffect,
    0,
    1,
  );
  const failureBonus = rarity === "legendary"
    ? previousFailures * GAME_CONFIG.legendaryEnrollmentChancePerFailure
    : 0;
  const definition = PERSON_RARITIES[rarity];
  const improvedChance = definition.baseEnrollmentChance +
    (definition.maxEnrollmentChance - definition.baseEnrollmentChance) * improvementProgress;
  return clamp(
    improvedChance + failureBonus,
    definition.baseEnrollmentChance,
    definition.maxEnrollmentChance,
  );
}

export function getEventFunnelOutcome(
  state: GameState,
  definition: AcquisitionEventDefinition,
  attendanceVariance = 1,
) {
  const charismaMultiplier = 1 + getEventCharismaBonus(state);
  const collaboratorMultiplier = 1 + getEventCollaboratorBonus(state);
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
  const networkMultiplier = 1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  const specializationMultiplier = state.school.specialization === "redazione" ? 1.1 : 1;
  return localPower * networkMultiplier * specializationMultiplier;
}

const ANNUAL_DEPARTURE_CHANCE_BY_FORM = [0.8, 0.65, 0.5, 0.35, 0.25, 0.15, 0.1, 0.05] as const;

export function getMemberAnnualDepartureChance(
  forms: FormId[],
  rarity: PersonRarity = "common",
  foundedSchools = 0,
): number {
  if (rarity === "legendary") return 0;

  const highestForm = forms.reduce((highest, formId) => {
    const match = /^form-(\d)/.exec(formId);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  if (highestForm >= 7) {
    return Math.round(clamp(
      GAME_CONFIG.formSevenDepartureChance[rarity] +
        Math.max(0, foundedSchools) * GAME_CONFIG.departureChancePerFoundedSchool,
      0,
      1,
    ) * 1_000) / 1_000;
  }
  const ordinaryChance = ANNUAL_DEPARTURE_CHANCE_BY_FORM[Math.min(7, highestForm)];
  return ordinaryChance;
}
