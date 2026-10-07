import type { TournamentCircuitLevel } from "../../content/tournamentSchools";
import type { MigratableState } from "./types";

type DifficultyMultipliers = Record<TournamentCircuitLevel, number>;

const VERSION_59_DIFFICULTY_MULTIPLIERS: DifficultyMultipliers = {
  academy: 150 / 125,
  national: 200 / 150,
  champions: 250 / 200,
};

// Livelli dei Leggendari Segreti com'erano fino alla v104: le migrazioni
// storiche restano ferme anche se il catalogo cambia (07/10). Assenti = Chronicles.
const HISTORICAL_LEVELS: Record<string, TournamentCircuitLevel> = {
  "marco-palena": "academy",
  "lorenzo-todaro": "academy",
  "daniele-panizza": "academy",
  "sara-magnifico": "academy",
  "daniele-maggi": "academy",
  "pietro-scarica": "national",
  "piero-dipalo": "national",
  "simone-pedrazzi": "national",
};

function getDifficultyMultiplier(
  profileId: string | undefined,
  multipliers: DifficultyMultipliers,
): number {
  const level = profileId ? HISTORICAL_LEVELS[profileId] : undefined;
  return level ? multipliers[level] : 1;
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
