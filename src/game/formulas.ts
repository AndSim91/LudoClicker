import { getUpgradeEffectTotal } from "../content/upgrades";
import type { AcquisitionEventDefinition } from "../content/events";
import { getCollaboratorProductivity } from "../content/forms";
import { PERSON_RARITIES } from "../content/rarities";
import { GAME_CONFIG } from "./config";
import type { FormId, GameState, PersonRarity } from "./types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getEmailBookingChance(state: GameState) {
  const specializationBonus = state.school.specialization === "accoglienza" ? 0.1 : 0;
  const multiplier = 1 + getUpgradeEffectTotal(state.upgrades, "bookingMultiplier") + specializationBonus;
  return clamp(GAME_CONFIG.emailBookingChance * multiplier, 0.01, 0.7);
}

export function getEnrollmentChance(
  state: GameState,
  rarity: PersonRarity = "common",
  previousFailures = 0,
) {
  const lessonProductivity = state.collaborators
    .filter((collaborator) => collaborator.assignment === "lessons")
    .reduce((total, collaborator) => total + getCollaboratorProductivity(collaborator), 0);
  const multiplier =
    1 +
    getUpgradeEffectTotal(state.upgrades, "enrollmentMultiplier") +
    lessonProductivity * 0.1 +
    (state.school.specialization === "accoglienza" ? 0.1 : 0);
  const failureBonus = rarity === "legendary"
    ? previousFailures * GAME_CONFIG.legendaryEnrollmentChancePerFailure
    : 0;
  const baseChance = PERSON_RARITIES[rarity].baseEnrollmentChance + failureBonus;
  return clamp(baseChance * multiplier, 0.01, 1);
}

export function getEventFunnelOutcome(
  state: GameState,
  definition: AcquisitionEventDefinition,
  attendanceVariance = 1,
) {
  const charismaMultiplier =
    1 + getUpgradeEffectTotal(state.upgrades, "eventContactsMultiplier");
  const equipmentMultiplier = 1 - Math.min(0.25, state.equipment.wear / 400);
  const attendanceMultiplier =
    1 + getUpgradeEffectTotal(state.upgrades, "eventAttendanceMultiplier") +
    (state.school.specialization === "eventi" ? 0.1 : 0) +
    state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  const eventProductivity = state.collaborators
    .filter((collaborator) => collaborator.assignment === "events")
    .reduce((total, collaborator) => total + getCollaboratorProductivity(collaborator), 0);
  const collaboratorMultiplier = 1 + eventProductivity * 0.1;
  const peopleMet = Math.max(
    1,
    Math.round(
      definition.baseAttendance *
        attendanceVariance *
        equipmentMultiplier *
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
  const contactsObtained = Math.max(
    1,
    Math.round(demonstrationsGiven * emailShareChance),
  );
  return { peopleMet, demonstrationsGiven, contactsObtained, emailShareChance };
}

export function getWritingPower(state: GameState) {
  const localPower = 1 + Math.floor(getUpgradeEffectTotal(state.upgrades, "writingPower"));
  const networkMultiplier = 1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  const specializationMultiplier = state.school.specialization === "redazione" ? 1.1 : 1;
  return localPower * networkMultiplier * specializationMultiplier;
}

const ANNUAL_DEPARTURE_CHANCE_BY_FORM = [0.8, 0.65, 0.5, 0.35, 0.25, 0.15, 0.1, 0.05] as const;

export function getMemberAnnualDepartureChance(forms: FormId[]): number {
  const highestForm = forms.reduce((highest, formId) => {
    const match = /^form-(\d)/.exec(formId);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return ANNUAL_DEPARTURE_CHANCE_BY_FORM[Math.min(7, highestForm)];
}

export function getLegendaryAnnualDepartureChance(forms: FormId[]): number {
  return getMemberAnnualDepartureChance(forms) * GAME_CONFIG.legendaryDepartureMultiplier;
}
