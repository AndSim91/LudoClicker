import type { MigratableState } from "./types";

/*
 * v93: the Consiglio delle Onde scene plays when the sector view unlocks
 * (8 collaborators), no longer at the first collaborator. A save that saw it
 * early and has no Consiglio yet gets to see it again when the Consiglio forms.
 */
export function migrateCouncilMomentState(state: MigratableState): MigratableState {
  if (state.version !== 92) return state;
  const moments = state.moments;
  if (!moments || state.collaboratorManagement?.aggregateViewUnlocked) return { ...state, version: 93 };
  const keep = (key: string) => key !== "council";
  return {
    ...state,
    version: 93,
    moments: { seen: moments.seen.filter(keep), queue: moments.queue.filter(keep) },
  };
}
