import type { MigratableState } from "./types";

interface LegacyReptileEdition {
  status?: string;
  startedAt?: number;
  previousAssignments?: Record<string, string | null>;
}

/*
 * v92, Reptile rifatto: an edition prepared with the old system is cancelled
 * and the next one starts from zero. Collaborators moved into the old sectors
 * go back to their previous jobs, with their own training shifted as the old
 * preparation had frozen it. The old recap has another shape and goes too.
 */
export function migrateReptileRebuildState(state: MigratableState): MigratableState {
  if (state.version !== 91) return state;
  const reptile = state.tournaments?.reptile as
    | (Record<string, unknown> & { activeEdition?: LegacyReptileEdition })
    | undefined;
  if (!state.tournaments || !reptile) return { ...state, version: 92 };
  const edition = reptile.activeEdition;
  const frozen = edition && (edition.status === "minigame" || edition.status === "preparing")
    ? edition.previousAssignments ?? {}
    : {};
  const pausedMs = Math.max(0, (state.lastSavedAt ?? edition?.startedAt ?? 0) - (edition?.startedAt ?? 0));
  const rest: Record<string, unknown> = { ...reptile };
  delete rest.activeEdition;
  delete rest.latestRecap;
  delete rest.nextPreparationSchoolYear;
  return {
    ...state,
    version: 92,
    collaborators: state.collaborators?.map((collaborator) => {
      if (!(collaborator.id in frozen)) return collaborator;
      return {
        ...collaborator,
        assignment: frozen[collaborator.id] as typeof collaborator.assignment,
        training: collaborator.training
          ? {
              ...collaborator.training,
              startedAt: collaborator.training.startedAt + pausedMs,
              completesAt: collaborator.training.completesAt + pausedMs,
            }
          : collaborator.training,
      };
    }),
    tournaments: {
      ...state.tournaments,
      reptile: rest as unknown as NonNullable<MigratableState["tournaments"]>["reptile"],
    },
  };
}
