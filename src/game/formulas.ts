import { getUpgradeEffectTotal } from "../content/upgrades";
import type { AcquisitionEventDefinition } from "../content/events";
import { getCollaboratorProductivity } from "../content/forms";
import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getEmailBookingChance(state: GameState) {
  const specializationBonus = state.school.specialization === "accoglienza" ? 0.1 : 0;
  const multiplier = 1 + getUpgradeEffectTotal(state.upgrades, "bookingMultiplier") + specializationBonus;
  return clamp(GAME_CONFIG.emailBookingChance * multiplier, 0.01, 0.7);
}

export function getEnrollmentChance(state: GameState) {
  const lessonProductivity = state.collaborators
    .filter((collaborator) => collaborator.assignment === "lessons")
    .reduce((total, collaborator) => total + getCollaboratorProductivity(collaborator), 0);
  const multiplier =
    1 +
    getUpgradeEffectTotal(state.upgrades, "enrollmentMultiplier") +
    lessonProductivity * 0.1 +
    (state.school.specialization === "accoglienza" ? 0.1 : 0);
  return clamp(GAME_CONFIG.enrollmentChance * multiplier, 0.01, 0.9);
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
  const contactsObtained = Math.max(
    1,
    Math.round(
      demonstrationsGiven *
        definition.contactRate *
        charismaMultiplier *
        collaboratorMultiplier,
    ),
  );
  return { peopleMet, demonstrationsGiven, contactsObtained };
}

export function getWritingPower(state: GameState) {
  const localPower = 1 + Math.floor(getUpgradeEffectTotal(state.upgrades, "writingPower"));
  const networkMultiplier = 1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  const specializationMultiplier = state.school.specialization === "redazione" ? 1.1 : 1;
  return localPower * networkMultiplier * specializationMultiplier;
}
