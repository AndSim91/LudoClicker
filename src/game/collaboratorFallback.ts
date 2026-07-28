import { getCollaboratorProductivity } from "../content/forms";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { isSummerBreak } from "./calendar";
import { getEquipmentAutomaticRepairTarget } from "./equipment";
import { getInstructorTeachingCounts } from "./runtimeIndexes";
import { selectActiveEmail } from "./selectors";
import type {
  Collaborator,
  CollaboratorMasteryRole,
  GameState,
} from "./types";

function isPrimarySectorIdle(
  state: GameState,
  collaborator: Collaborator,
): boolean {
  switch (collaborator.assignment) {
    case "writing":
      return selectActiveEmail(state)?.status !== "writing" && !state.unlocks.social;
    case "events":
      return !state.acquisitionEvents.some((event) => event.status === "running");
    case "equipment":
      return getEquipmentAutomaticRepairTarget(state.equipment) === undefined;
    case "gadget":
      return !state.gadgets.activeWork &&
        !Object.values(state.gadgets.products).some((product) => product.accepted);
    case "instructor": {
      if (collaborator.training) return false;
      const teaching = getInstructorTeachingCounts(
        state.contacts,
        state.collaborators,
      ).get(collaborator.id) ?? 0;
      if (teaching > 0) return false;
      const preparationActive =
        (state.upgrades["athletic-preparation"] ?? 0) > 0 &&
        !isSummerBreak(state.school.currentMonth) &&
        state.contacts.some((contact) => contact.status === "enrolled");
      return !preparationActive;
    }
    default:
      return false;
  }
}

export function getCollaboratorFallbackProductivity(
  state: GameState,
  target: CollaboratorMasteryRole,
): number {
  const share = Math.min(
    0.5,
    getUpgradeEffectTotal(state.upgrades, "collaboratorFallbackTier"),
  );
  if (share <= 0) return 0;
  const configured = state.collaboratorManagement.fallbackAssignments ?? {};
  return state.collaborators.reduce((total, collaborator) => {
    const primary = collaborator.assignment;
    const secondary = collaborator.secondaryAssignment ??
      (primary ? configured[primary] : undefined);
    if (
      !primary ||
      primary === target ||
      secondary !== target ||
      !isPrimarySectorIdle(state, collaborator)
    ) return total;
    return total + getCollaboratorProductivity(collaborator, target) * share;
  }, 0);
}
