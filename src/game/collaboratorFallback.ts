import { hasAnyTraining } from "./trainingSlots";
import { getCollaboratorProductivity } from "../content/forms";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { getEquipmentAutomaticRepairTarget } from "./equipment";
import { getInstructorTeachingCounts } from "./runtimeIndexes";
import { getReptileSectorForRole, isReptileBarOpen } from "./reptileSectors";
import { selectActiveEmail, selectAthleticPreparationInstructorIds } from "./selectors";
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

/**
 * `preparing`: the Istruttori in Preparazione atletica, when the caller loops over
 * all collaborators. Computing it once per loop instead of once per person turns
 * a quadratic scan into a linear one (motore, 20/10/2026: a third of the time with
 * a thousand collaborators).
 */
export function isPrimarySectorIdle(
  state: GameState,
  collaborator: Collaborator,
  preparing?: () => ReadonlySet<string>,
): boolean {
  const role = collaborator.assignment;
  if (!role) return false;
  if (role !== "instructor") return !isSectorWorking(state, role);
  if (hasAnyTraining(collaborator)) return false;
  const teaching = getInstructorTeachingCounts(
    state.contacts,
    state.collaborators,
  ).get(collaborator.id) ?? 0;
  if (teaching > 0) return false;
  // Same rule as the Preparazione itself (15/10/2026): in summer it goes on, slower,
  // so an Istruttore preparing athletes is not «fermo» and does not also help elsewhere.
  return !(preparing?.() ?? selectAthleticPreparationInstructorIds(state)).has(collaborator.id);
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

/** The Istruttori in Preparazione atletica, computed at most once per loop over the collaborators. */
export function athleticPreparationOnce(state: GameState): () => ReadonlySet<string> {
  let ids: ReadonlySet<string> | undefined;
  return () => (ids ??= selectAthleticPreparationInstructorIds(state));
}

export function getShiftSummary(state: GameState): ShiftSummary {
  const receiver = getShiftReceiver(state);
  const preparing = athleticPreparationOnce(state);
  const helpers: Collaborator[] = [];
  const busyRoles = new Set<CollaboratorMasteryRole>();
  const staffedRoles = new Set<CollaboratorMasteryRole>();
  for (const collaborator of state.collaborators) {
    const role = collaborator.assignment;
    if (!role) continue;
    staffedRoles.add(role);
    if (!isPrimarySectorIdle(state, collaborator, preparing)) {
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
