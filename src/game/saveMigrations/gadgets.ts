import { createInitialCollaboratorMastery } from "../../content/mastery";
import { createInitialUpgradeLevels } from "../../content/upgrades";
import { sanitizeCollaboratorTargets } from "../collaboratorManagement";
import { didOwnedAthleteWinAcademyArena } from "../gadgetFlow";
import { createInitialGadgetState } from "../gadgetState";
import type { CollaboratorMastery } from "../types";
import type { MigratableState } from "./types";

function addGadgetMastery(
  mastery: Partial<CollaboratorMastery> | undefined,
): CollaboratorMastery {
  return {
    ...createInitialCollaboratorMastery(),
    ...mastery,
    gadget: Math.max(0, mastery?.gadget ?? 0),
  };
}

export function migrateGadgetState(state: MigratableState): MigratableState {
  if (state.version !== 65) return state;

  const gadgetUnlocked = (state.tournaments?.results ?? []).some(
    didOwnedAthleteWinAcademyArena,
  );
  const gadgets = createInitialGadgetState();
  if (gadgetUnlocked) gadgets.products.wristband.unlocked = true;

  const retainedProgress = Object.fromEntries(
    Object.entries(state.legendaryCollaborators?.retainedProgress ?? {}).map(
      ([profileId, progress]) => [
        profileId,
        progress
          ? { ...progress, mastery: addGadgetMastery(progress.mastery) }
          : progress,
      ],
    ),
  );

  return {
    ...state,
    version: 66,
    gadgets,
    collaborators: (state.collaborators ?? []).map((collaborator) => ({
      ...collaborator,
      mastery: addGadgetMastery(collaborator.mastery),
    })),
    collaboratorManagement: state.collaboratorManagement
      ? {
          ...state.collaboratorManagement,
          targets: sanitizeCollaboratorTargets(
            state.collaboratorManagement.targets ?? {},
          ),
        }
      : state.collaboratorManagement,
    legendaryCollaborators: state.legendaryCollaborators
      ? { ...state.legendaryCollaborators, retainedProgress }
      : state.legendaryCollaborators,
    unlocks: {
      upgrades: state.unlocks?.upgrades ?? false,
      collaborators: state.unlocks?.collaborators ?? false,
      social: state.unlocks?.social ?? false,
      forms: state.unlocks?.forms ?? false,
      gadget: gadgetUnlocked,
    },
    upgrades: {
      ...createInitialUpgradeLevels(),
      ...(state.upgrades ?? {}),
    },
  };
}
