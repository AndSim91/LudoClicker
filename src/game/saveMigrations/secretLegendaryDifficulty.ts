import {
  SECRET_LEGENDARIES,
  type SecretLegendaryId,
} from "../../content/secretLegendaries";
import {
  getTournamentSchool,
  type TournamentCircuitLevel,
} from "../../content/tournamentSchools";
import type { MigratableState } from "./types";

type DifficultyMultipliers = Record<TournamentCircuitLevel, number>;

const VERSION_59_DIFFICULTY_MULTIPLIERS: DifficultyMultipliers = {
  academy: 150 / 125,
  national: 200 / 150,
  champions: 250 / 200,
};

function getDifficultyMultiplier(
  profileId: string | undefined,
  multipliers: DifficultyMultipliers,
): number {
  if (!profileId || !(profileId in SECRET_LEGENDARIES)) return 1;
  const profile = SECRET_LEGENDARIES[profileId as SecretLegendaryId];
  if (!profile.schoolId) return 1;
  return multipliers[getTournamentSchool(profile.schoolId).level];
}

function scale(value: number | undefined, multiplier: number): number | undefined {
  return value === undefined ? value : value * multiplier;
}

export function applySecretLegendaryDifficultyChange(
  state: MigratableState,
  multipliers: DifficultyMultipliers,
): MigratableState {
  const contacts = (state.contacts ?? []).map((contact) => {
    const multiplier = getDifficultyMultiplier(
      contact.secretLegendaryId ?? contact.specialProfileId,
      multipliers,
    );
    return multiplier === 1
      ? contact
      : {
          ...contact,
          arenaBase: scale(contact.arenaBase, multiplier),
          styleBase: scale(contact.styleBase, multiplier),
        };
  });
  const retainedProgress = Object.fromEntries(
    Object.entries(state.legendaryCollaborators?.retainedProgress ?? {}).map(
      ([profileId, progress]) => {
        const multiplier = getDifficultyMultiplier(profileId, multipliers);
        return [
          profileId,
          !progress || multiplier === 1
            ? progress
            : {
                ...progress,
                arenaBase: scale(progress.arenaBase, multiplier),
                styleBase: scale(progress.styleBase, multiplier),
              },
        ];
      },
    ),
  );

  return {
    ...state,
    contacts,
    legendaryCollaborators: state.legendaryCollaborators
      ? { ...state.legendaryCollaborators, retainedProgress }
      : state.legendaryCollaborators,
  };
}

export function migrateSecretLegendaryDifficultyState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 58) return state;

  return {
    ...applySecretLegendaryDifficultyChange(
      state,
      VERSION_59_DIFFICULTY_MULTIPLIERS,
    ),
    version: 59,
  };
}
