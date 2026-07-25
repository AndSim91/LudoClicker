import {
  SECRET_LEGENDARIES,
  type SecretLegendaryId,
} from "../../content/secretLegendaries";
import { getTournamentSchool } from "../../content/tournamentSchools";
import { TOURNAMENT_DIFFICULTY_MULTIPLIERS } from "../../content/tournaments";
import type { MigratableState } from "./types";

function getDifficultyMultiplier(profileId: string | undefined): number {
  if (!profileId || !(profileId in SECRET_LEGENDARIES)) return 1;
  const profile = SECRET_LEGENDARIES[profileId as SecretLegendaryId];
  if (!profile.schoolId) return 1;
  return TOURNAMENT_DIFFICULTY_MULTIPLIERS[getTournamentSchool(profile.schoolId).level];
}

function boost(value: number | undefined, multiplier: number): number | undefined {
  return value === undefined ? value : value * multiplier;
}

export function migrateSecretLegendaryDifficultyState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 58) return state;

  const contacts = (state.contacts ?? []).map((contact) => {
    const multiplier = getDifficultyMultiplier(
      contact.secretLegendaryId ?? contact.specialProfileId,
    );
    return multiplier === 1
      ? contact
      : {
          ...contact,
          arenaBase: boost(contact.arenaBase, multiplier),
          styleBase: boost(contact.styleBase, multiplier),
        };
  });
  const retainedProgress = Object.fromEntries(
    Object.entries(state.legendaryCollaborators?.retainedProgress ?? {}).map(
      ([profileId, progress]) => {
        const multiplier = getDifficultyMultiplier(profileId);
        return [
          profileId,
          !progress || multiplier === 1
            ? progress
            : {
                ...progress,
                arenaBase: boost(progress.arenaBase, multiplier),
                styleBase: boost(progress.styleBase, multiplier),
              },
        ];
      },
    ),
  );

  return {
    ...state,
    version: 59,
    contacts,
    legendaryCollaborators: state.legendaryCollaborators
      ? { ...state.legendaryCollaborators, retainedProgress }
      : state.legendaryCollaborators,
  };
}
