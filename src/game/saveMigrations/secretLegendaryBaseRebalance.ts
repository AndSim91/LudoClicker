import type { MigratableState } from "./types";

const VERSION_70_BASE_REBALANCE = {
  "marco-palena": {
    previous: [75, 90],
    next: [140 / (1.4 * 1.15), 155 / (1.4 * 1.15)],
  },
  "lorenzo-todaro": {
    previous: [80, 80],
    next: [151 / (1.5 * 1.15), 151 / (1.5 * 1.15)],
  },
  "pietro-scarica": {
    previous: [92, 94],
    next: [220 / (1.5 * 1.3), 230 / (1.5 * 1.3)],
  },
  "daniele-panizza": {
    previous: [81, 62],
    next: [155 / (1.4 * 1.15), 140 / (1.4 * 1.15)],
  },
  "sara-magnifico": {
    previous: [58, 87],
    next: [130 / (1.5 * 1.15), 165 / (1.5 * 1.15)],
  },
  "piero-dipalo": {
    previous: [169, 169],
    next: [200, 210],
  },
  "daniele-maggi": {
    previous: [150, 150],
    next: [140, 140],
  },
  "simone-pedrazzi": {
    previous: [122, 145],
    next: [200, 225],
  },
} as const;

type RebalancedSecretLegendaryId = keyof typeof VERSION_70_BASE_REBALANCE;

function getRebalance(profileId: string | undefined) {
  if (!profileId || !(profileId in VERSION_70_BASE_REBALANCE)) return undefined;
  return VERSION_70_BASE_REBALANCE[profileId as RebalancedSecretLegendaryId];
}

function preserveEarnedGain(
  value: number | undefined,
  previousBase: number,
  nextBase: number,
): number | undefined {
  return value === undefined ? undefined : nextBase + (value - previousBase);
}

export function migrateSecretLegendaryBaseRebalanceState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 69) return state;

  const contacts = (state.contacts ?? []).map((contact) => {
    const rebalance = getRebalance(
      contact.secretLegendaryId ?? contact.specialProfileId,
    );
    if (!rebalance) return contact;

    return {
      ...contact,
      arenaBase: preserveEarnedGain(
        contact.arenaBase,
        rebalance.previous[0],
        rebalance.next[0],
      ),
      styleBase: preserveEarnedGain(
        contact.styleBase,
        rebalance.previous[1],
        rebalance.next[1],
      ),
    };
  });
  const retainedProgress = Object.fromEntries(
    Object.entries(state.legendaryCollaborators?.retainedProgress ?? {}).map(
      ([profileId, progress]) => {
        const rebalance = getRebalance(profileId);
        return [
          profileId,
          !progress || !rebalance
            ? progress
            : {
                ...progress,
                arenaBase: preserveEarnedGain(
                  progress.arenaBase,
                  rebalance.previous[0],
                  rebalance.next[0],
                ),
                styleBase: preserveEarnedGain(
                  progress.styleBase,
                  rebalance.previous[1],
                  rebalance.next[1],
                ),
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
    version: 70,
  };
}
