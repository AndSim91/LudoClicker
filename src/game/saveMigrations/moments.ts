import { getReachedMomentKeys } from "../moments";
import type { GameState } from "../types";
import type { MigratableState } from "./types";

/*
 * v88, Momenti animati (4.2): what the save already reached counts as seen, so
 * an old save does not replay its history; each Leggendario enrolled so far
 * counts one enrollment (the save never kept how many).
 */
export function migrateMomentsState(state: MigratableState): MigratableState {
  if (state.version !== 87) return state;
  const progress = state.legendaryCollaborators;
  const legendaryCollaborators = progress
    ? {
        ...progress,
        enrollmentCounts: Object.fromEntries([
          ...(progress.enrolledProfileIds ?? []),
          ...Object.keys(progress.retainedProgress ?? {}),
        ].map((id) => [id, 1])),
      }
    : progress;
  const migrated = { ...state, version: 88, legendaryCollaborators };
  const seen = getReachedMomentKeys({
    statistics: migrated.statistics ?? {},
    legendaryCollaborators: {
      enrolledProfileIds: legendaryCollaborators?.enrolledProfileIds ?? [],
      retainedProgress: legendaryCollaborators?.retainedProgress ?? {},
    },
    collaborators: migrated.collaborators ?? [],
    collaboratorManagement: { aggregateViewUnlocked: migrated.collaboratorManagement?.aggregateViewUnlocked === true },
    network: { schools: migrated.network?.schools ?? [] },
  } as unknown as GameState);
  return { ...migrated, moments: { seen, queue: [] } };
}
