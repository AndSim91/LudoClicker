import { getContactBaseStats } from "./athleteStats";
import { GAME_CONFIG } from "./config";
import { addLegendaryEncounters, createAcquiredContacts, mergeAcquiredContacts } from "./contacts";
import { nextRandom } from "./random";
import {
  getSocialContactChance,
  getSocialFollowerChance,
} from "./social";
import type { GameState } from "./types";

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

export interface SocialContentOutcome {
  state: GameState;
  cycles: number;
  followersGained: number;
  contactsAcquired: number;
}

export function resolveSocialContentCycles(
  state: GameState,
  cycleCount: number,
  now: number,
): SocialContentOutcome {
  const cycles = Math.max(0, Math.floor(cycleCount));
  if (cycles === 0) {
    return {
      state,
      cycles: 0,
      followersGained: 0,
      contactsAcquired: 0,
    };
  }

  let nextSeed = state.randomSeed;
  let followers = state.school.followers;
  let followersGained = 0;
  let contactsAcquired = 0;
  for (let index = 0; index < cycles; index += 1) {
    const followerChance = getSocialFollowerChance(state.upgrades);
    const contactChance = getSocialContactChance(followers, state.upgrades);

    const [followerRoll, seedAfterFollower] = nextRandom(nextSeed);
    const [contactRoll, seedAfterContact] = nextRandom(seedAfterFollower);
    nextSeed = seedAfterContact;
    if (followerRoll < followerChance) {
      followers += 1;
      followersGained += 1;
    }
    if (contactRoll < contactChance) contactsAcquired += 1;
  }

  let nextState: GameState = {
    ...state,
    randomSeed: nextSeed,
    school: {
      ...state.school,
      followers,
      historicMembers: state.school.historicMembers + followersGained,
    },
    statistics: {
      ...state.statistics,
      socialContentCycles: state.statistics.socialContentCycles + cycles,
      socialFollowersGained:
        state.statistics.socialFollowersGained + followersGained,
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

  return {
    state: nextState,
    cycles,
    followersGained,
    contactsAcquired,
  };
}
