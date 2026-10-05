import { getCollaboratorProductivity } from "../content/forms";
import {
  getUpgradeEffectTotal,
  isAthleticPreparationUnlocked,
} from "../content/upgrades";
import { isSummerBreak } from "./calendar";
import { getEquipmentAutomaticRepairTarget } from "./equipment";
import { getInstructorTeachingCounts } from "./runtimeIndexes";
import { getReptileSectorForRole, isReptileBarOpen } from "./reptileSectors";
import { selectActiveEmail } from "./selectors";
import type {
  Collaborator,
  CollaboratorMasteryRole,
  GameState,
} from "./types";

/*
 * «Turni e precedenza» (proposta B): one row decides everything. Whoever is
 * idle gives a share of their productivity to the first sector of the row that
 * is working; the same row decides who spends scarce euros and swords first.
 * Instructors can help but never receive help.
 */

/** The row as the player sees it: Gadget only once unlocked. */
export function getShiftRow(state: GameState): CollaboratorMasteryRole[] {
  return state.collaboratorManagement.operationalPriorities.filter(
    (role) => role !== "gadget" || state.unlocks.gadget,
  );
}

/** Whether a sector has work right now (Instructors are judged per person). */
function isSectorWorking(state: GameState, role: CollaboratorMasteryRole): boolean {
  switch (role) {
    case "writing":
      return state.unlocks.social || selectActiveEmail(state)?.status === "writing";
    case "events":
      return state.acquisitionEvents.some((event) => event.status === "running");
    case "equipment":
      return getEquipmentAutomaticRepairTarget(state.equipment) !== undefined;
    case "gadget":
      return state.gadgets.activeWorks.length > 0 ||
        Object.values(state.gadgets.products).some((product) => product.accepted);
    default:
      return false;
  }
}

export function isPrimarySectorIdle(
  state: GameState,
  collaborator: Collaborator,
): boolean {
  const role = collaborator.assignment;
  if (!role) return false;
  if (role !== "instructor") return !isSectorWorking(state, role);
  if (collaborator.training) return false;
  const teaching = getInstructorTeachingCounts(
    state.contacts,
    state.collaborators,
  ).get(collaborator.id) ?? 0;
  if (teaching > 0) return false;
  const preparationActive =
    isAthleticPreparationUnlocked(state.upgrades) &&
    !isSummerBreak(state.school.currentMonth) &&
    state.contacts.some((contact) => contact.status === "enrolled");
  return !preparationActive;
}

export function getShiftShare(state: GameState): number {
  return Math.min(0.5, getUpgradeEffectTotal(state.upgrades, "collaboratorFallbackTier"));
}

/** The first sector of the row that is working and can receive help. */
export function getShiftReceiver(state: GameState): CollaboratorMasteryRole | undefined {
  return getShiftRow(state).find(
    (role) => role !== "instructor" && isSectorWorking(state, role),
  );
}

export interface ShiftSummary {
  receiver?: CollaboratorMasteryRole;
  helpers: Collaborator[];
  /** Sectors with people where everyone is idle. */
  idleRoles: Set<CollaboratorMasteryRole>;
}

export function getShiftSummary(state: GameState): ShiftSummary {
  const receiver = getShiftReceiver(state);
  const helpers: Collaborator[] = [];
  const busyRoles = new Set<CollaboratorMasteryRole>();
  const staffedRoles = new Set<CollaboratorMasteryRole>();
  for (const collaborator of state.collaborators) {
    const role = collaborator.assignment;
    if (!role) continue;
    staffedRoles.add(role);
    if (!isPrimarySectorIdle(state, collaborator)) {
      busyRoles.add(role);
      continue;
    }
    // Idle people of a sector still filling its Reptile bar give everything to the bar.
    const reptileSector = getReptileSectorForRole(role);
    if (reptileSector && isReptileBarOpen(state, reptileSector)) continue;
    if (receiver && role !== receiver) helpers.push(collaborator);
  }
  const idleRoles = new Set([...staffedRoles].filter((role) => !busyRoles.has(role)));
  return { receiver, helpers, idleRoles };
}

export function getCollaboratorFallbackProductivity(
  state: GameState,
  target: CollaboratorMasteryRole,
): number {
  const share = getShiftShare(state);
  if (share <= 0 || getShiftReceiver(state) !== target) return 0;
  return getShiftSummary(state).helpers.reduce(
    (total, collaborator) => total + getCollaboratorProductivity(collaborator, target) * share,
    0,
  );
}
