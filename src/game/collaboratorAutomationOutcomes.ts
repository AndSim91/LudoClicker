import { getContactBaseStats } from "./athleteStats";
import { GAME_CONFIG } from "./config";
import { addLegendaryEncounters, createAcquiredContacts, mergeAcquiredContacts } from "./contacts";
import { roundCurrency } from "./economy";
import { makeGameId } from "./ids";
import { nextRandom } from "./random";
import {
  getSocialContactChance,
  getSocialIncomePerMember,
  getSocialTrialChance,
} from "./social";
import type { GameState, ScheduledTrial } from "./types";

export function improveRandomAthletes(
  state: GameState,
  improvementCount: number,
): { state: GameState; improvements: number } {
  const enrolledIndices = state.contacts.flatMap((contact, index) =>
    contact.status === "enrolled" ? [index] : []
  );
  const nextIndices = enrolledIndices.filter((index) =>
    state.contacts[index].id !== state.automation.lastImprovedAthleteId
  );
  const availableIndices = nextIndices.length > 0 ? nextIndices : enrolledIndices;
  if (improvementCount <= 0 || availableIndices.length === 0) {
    return { state, improvements: 0 };
  }

  const contacts = [...state.contacts];
  let nextSeed = state.randomSeed;
  let lastImprovedAthlete: string | undefined;
  let lastImprovedAthleteId: string | undefined;
  let previousAthleteId = state.automation.lastImprovedAthleteId;
  let improvements = 0;
  for (let index = 0; index < improvementCount; index += 1) {
    const [favoriteRoll, seedAfterFavorite] = nextRandom(nextSeed);
    const [athleteRoll, seedAfterAthlete] = nextRandom(seedAfterFavorite);
    const [statRoll, seedAfterStat] = nextRandom(seedAfterAthlete);
    nextSeed = seedAfterStat;
    const nextEligibleIndices = enrolledIndices.filter((contactIndex) =>
      contacts[contactIndex].id !== previousAthleteId
    );
    const nextAvailableIndices = nextEligibleIndices.length > 0
      ? nextEligibleIndices
      : enrolledIndices;
    if (nextAvailableIndices.length === 0) break;
    const nextFavoriteIndices = nextAvailableIndices.filter((contactIndex) =>
      contacts[contactIndex].favorite === true
    );
    const candidateIndices =
      favoriteRoll < GAME_CONFIG.athleticPreparationFavoriteChance && nextFavoriteIndices.length > 0
        ? nextFavoriteIndices
        : nextAvailableIndices;
    const candidatePosition = Math.min(
      candidateIndices.length - 1,
      Math.floor(athleteRoll * candidateIndices.length),
    );
    const contactIndex = candidateIndices[candidatePosition];
    const contact = contacts[contactIndex];
    const stats = getContactBaseStats(contact);
    contacts[contactIndex] = statRoll < 0.5
      ? {
          ...contact,
          arenaBase: stats.arena + 1,
          styleBase: stats.style,
        }
      : {
          ...contact,
          arenaBase: stats.arena,
          styleBase: stats.style + 1,
        };
    lastImprovedAthlete = `${contact.firstName} ${contact.lastName}`;
    lastImprovedAthleteId = contact.id;
    previousAthleteId = contact.id;
    improvements += 1;
  }

  return {
    state: {
      ...state,
      randomSeed: nextSeed,
      contacts,
      automation: {
        ...state.automation,
        lastImprovedAthlete,
        lastImprovedAthleteId,
      },
    },
    improvements,
  };
}

export function scheduleSocialTrials(
  state: GameState,
  trialCount: number,
  now: number,
): GameState {
  if (trialCount <= 0) return state;
  const acquired = createAcquiredContacts(state, trialCount, "social", now);
  let nextSeed = acquired.nextSeed;
  const trialOffset = state.historyArchive.completedTrials + state.scheduledTrials.length;
  const trials: ScheduledTrial[] = acquired.contacts.map((contact, index) => {
    const [resultRoll, seedAfterResult] = nextRandom(nextSeed);
    nextSeed = seedAfterResult;
    return {
      id: makeGameId("trial", now, trialOffset + index),
      contactId: contact.id,
      startsAt: now,
      resolvesAt: now + GAME_CONFIG.trialDurationMs,
      resultSeed: Math.floor(resultRoll * 2_147_483_647),
      status: "scheduled",
    };
  });

  return {
    ...state,
    randomSeed: nextSeed,
    legendaryCollaborators: addLegendaryEncounters(
      state.legendaryCollaborators,
      acquired.contacts,
    ),
    contacts: mergeAcquiredContacts(
      state.contacts,
      acquired.contacts.map((contact) => ({ ...contact, status: "trialScheduled" as const })),
    ),
    scheduledTrials: [...state.scheduledTrials, ...trials],
    statistics: {
      ...state.statistics,
      trialsBooked: state.statistics.trialsBooked + trialCount,
      socialTrials: state.statistics.socialTrials + trialCount,
    },
  };
}

export interface SocialAutomationOutcome {
  state: GameState;
  cycles: number;
  eurosEarned: number;
  followersGained: number;
  trialsBooked: number;
  contactsAcquired: number;
}

export function resolveSocialAutomationCycles(
  state: GameState,
  cycleCount: number,
  now: number,
): SocialAutomationOutcome {
  const cycles = Math.max(0, Math.floor(cycleCount));
  if (cycles === 0) {
    return {
      state,
      cycles: 0,
      eurosEarned: 0,
      followersGained: 0,
      trialsBooked: 0,
      contactsAcquired: 0,
    };
  }

  let nextSeed = state.randomSeed;
  let followers = state.school.followers;
  let followersGained = 0;
  let eurosEarned = 0;
  let trialsBooked = 0;
  let contactsAcquired = 0;
  for (let index = 0; index < cycles; index += 1) {
    const trialChance = getSocialTrialChance(followers);
    const contactChance = getSocialContactChance(followers);
    eurosEarned += state.school.activeMembers * getSocialIncomePerMember(followers);

    const [followerRoll, seedAfterFollower] = nextRandom(nextSeed);
    const [trialRoll, seedAfterTrial] = nextRandom(seedAfterFollower);
    const [contactRoll, seedAfterContact] = nextRandom(seedAfterTrial);
    nextSeed = seedAfterContact;
    if (followerRoll < GAME_CONFIG.socialFollowerChance) {
      followers += 1;
      followersGained += 1;
    }
    if (trialRoll < trialChance) trialsBooked += 1;
    if (contactRoll < contactChance) contactsAcquired += 1;
  }

  eurosEarned = roundCurrency(eurosEarned);
  let nextState: GameState = {
    ...state,
    randomSeed: nextSeed,
    school: {
      ...state.school,
      euros: roundCurrency(state.school.euros + eurosEarned),
      followers,
    },
    statistics: {
      ...state.statistics,
      eurosEarned: roundCurrency(state.statistics.eurosEarned + eurosEarned),
    },
  };

  if (contactsAcquired > 0) {
    const acquired = createAcquiredContacts(nextState, contactsAcquired, "social", now);
    nextState = {
      ...nextState,
      randomSeed: acquired.nextSeed,
      legendaryCollaborators: addLegendaryEncounters(
        nextState.legendaryCollaborators,
        acquired.contacts,
      ),
      contacts: mergeAcquiredContacts(nextState.contacts, acquired.contacts),
      statistics: {
        ...nextState.statistics,
        contactsAcquired: nextState.statistics.contactsAcquired + contactsAcquired,
        socialContacts: nextState.statistics.socialContacts + contactsAcquired,
      },
    };
  }

  if (trialsBooked > 0) {
    nextState = scheduleSocialTrials(nextState, trialsBooked, now);
  }

  return {
    state: nextState,
    cycles,
    eurosEarned,
    followersGained,
    trialsBooked,
    contactsAcquired,
  };
}
