import { addLegendaryEncounters, createAcquiredContacts, mergeAcquiredContacts } from "./contacts";
import { GAME_CONFIG } from "./config";
import { makeGameId } from "./ids";
import { getAvailableStandardLegendaryProfiles } from "./legendaryAvailability";
import { nextRandom } from "./random";
import { recruitCollaborator } from "./collaboratorFlow";
import { startNextCampaign } from "./emailFlow";
import { unlockSocialIfEligible } from "./unlocks";
import type {
  Contact,
  GameState,
  TournamentReward,
  TournamentRewardBonus,
  TournamentResult,
} from "./types";

export function getTournamentRewardBonus(reward: TournamentReward): TournamentRewardBonus | undefined {
  return reward.bonus ?? (reward.contacts > 0
    ? { kind: "random-contacts", amount: reward.contacts }
    : undefined);
}

export function getTournamentRewardFollowers(reward: TournamentReward): number {
  return reward.followers ?? 0;
}

export function describeTournamentRewardBonus(reward: TournamentReward): string {
  const followers = getTournamentRewardFollowers(reward);
  if (followers > 0) return `+${followers} follower`;
  const bonus = getTournamentRewardBonus(reward);
  if (!bonus) return "Nessun bonus aggiuntivo";
  if (bonus.kind === "random-contacts") {
    return bonus.amount === 1
      ? "1 contatto email casuale"
      : `${bonus.amount} contatti casuali`;
  }
  if (bonus.kind === "trial") {
    return `1 prova in palestra ${bonus.rarity === "ultra-rare" ? "ultra rara" : "leggendaria"}`;
  }
  if (bonus.kind === "email") {
    return `1 contatto email ${bonus.rarity === "ultra-rare" ? "ultra raro" : "leggendario"}`;
  }
  return `1 iscrizione ${bonus.rarity === "ultra-rare" ? "ultra rara" : "leggendaria"}`;
}

export function resolveTournamentRewardFallbacks(
  state: Pick<
    GameState,
    "contacts" | "collaborators" | "legendaryCollaborators" | "scheduledTrials"
  >,
  result: TournamentResult,
  now: number,
): TournamentResult {
  let availableLegendaryCount = getAvailableStandardLegendaryProfiles(state, now).length;
  let changed = false;
  const rewards = result.rewards.map((reward) => {
    const bonus = getTournamentRewardBonus(reward);
    if (!bonus || bonus.kind === "random-contacts" || bonus.rarity !== "legendary") {
      return reward;
    }
    if (availableLegendaryCount > 0) {
      availableLegendaryCount -= 1;
      return reward;
    }
    changed = true;
    return {
      ...reward,
      bonus: { ...bonus, rarity: "ultra-rare" as const },
    };
  });
  return changed ? { ...result, rewards } : result;
}

function addRewardContacts(
  state: GameState,
  count: number,
  now: number,
  forcedRarity?: "ultra-rare" | "legendary",
): { state: GameState; contacts: Contact[] } {
  const acquired = createAcquiredContacts(
    state,
    count,
    "tournament",
    now,
    forcedRarity ? { forcedRarity } : undefined,
  );
  return {
    state: {
      ...state,
      randomSeed: acquired.nextSeed,
      contacts: mergeAcquiredContacts(state.contacts, acquired.contacts),
      legendaryCollaborators: addLegendaryEncounters(
        state.legendaryCollaborators,
        acquired.contacts,
      ),
      statistics: {
        ...state.statistics,
        contactsAcquired: state.statistics.contactsAcquired + acquired.contacts.length,
      },
    },
    contacts: acquired.contacts,
  };
}

function scheduleRewardTrial(state: GameState, contactId: string, now: number): GameState {
  const [resultSeed, nextSeed] = nextRandom(state.randomSeed);
  const trial: GameState["scheduledTrials"][number] = {
    id: makeGameId("trial", now, `tournament-${contactId}`),
    contactId,
    startsAt: now,
    resolvesAt: now + GAME_CONFIG.trialDurationMs,
    resultSeed,
    status: "scheduled",
  };
  return {
    ...state,
    randomSeed: nextSeed,
    contacts: state.contacts.map((contact) =>
      contact.id === contactId ? { ...contact, status: "trialScheduled" as const } : contact,
    ),
    scheduledTrials: [...state.scheduledTrials, trial],
    statistics: {
      ...state.statistics,
      trialsBooked: state.statistics.trialsBooked + 1,
    },
  };
}

function enrollRewardContact(state: GameState, contactId: string, now: number): GameState {
  const contact = state.contacts.find((candidate) => candidate.id === contactId);
  if (!contact) return state;

  const nextActiveMembers = state.school.activeMembers + 1;
  const nextContact = {
    ...contact,
    status: "enrolled" as const,
    enrolledMonth: state.school.currentMonth,
  };
  const nextState: GameState = {
    ...state,
    contacts: state.contacts.map((candidate) =>
      candidate.id === contactId ? nextContact : candidate,
    ),
    school: {
      ...state.school,
      activeMembers: nextActiveMembers,
      peakActiveMembers: Math.max(state.school.peakActiveMembers, nextActiveMembers),
      historicMembers: state.school.historicMembers + 1,
    },
    unlocks: {
      ...state.unlocks,
      upgrades: true,
      forms: true,
    },
    statistics: {
      ...state.statistics,
      membersEnrolled: state.statistics.membersEnrolled + 1,
    },
    legendaryCollaborators: nextContact.specialProfileId
      ? {
          ...state.legendaryCollaborators,
          enrolledProfileIds: [
            ...new Set([
              ...state.legendaryCollaborators.enrolledProfileIds,
              nextContact.specialProfileId,
            ]),
        ],
      }
      : state.legendaryCollaborators,
  };
  const unlockedState = unlockSocialIfEligible(nextState);
  return nextContact.rarity === "legendary"
    ? recruitCollaborator(unlockedState, nextContact, now)
    : unlockedState;
}

export function applyTournamentRewards(
  state: GameState,
  result: TournamentResult,
  now: number,
): GameState {
  const resolvedResult = resolveTournamentRewardFallbacks(state, result, now);
  const euros = resolvedResult.rewards.reduce((total, reward) => total + reward.euros, 0);
  const followers = resolvedResult.rewards.reduce(
    (total, reward) => total + getTournamentRewardFollowers(reward),
    0,
  );
  let nextState: GameState = {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros + euros,
      followers: state.school.followers + followers,
      historicMembers: state.school.historicMembers + followers,
    },
    statistics: { ...state.statistics, eurosEarned: state.statistics.eurosEarned + euros },
  };

  for (const reward of resolvedResult.rewards) {
    const bonus = getTournamentRewardBonus(reward);
    if (!bonus) continue;

    if (bonus.kind === "random-contacts") {
      nextState = addRewardContacts(nextState, bonus.amount, now).state;
      continue;
    }

    const added = addRewardContacts(nextState, 1, now, bonus.rarity);
    nextState = added.state;
    const contact = added.contacts[0];
    if (!contact) continue;
    if (bonus.kind === "trial") {
      nextState = scheduleRewardTrial(nextState, contact.id, now);
    } else if (bonus.kind === "enrollment") {
      nextState = enrollRewardContact(nextState, contact.id, now);
    }
  }

  return startNextCampaign(nextState, now);
}
