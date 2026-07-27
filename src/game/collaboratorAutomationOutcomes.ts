import { getContactBaseStats } from "./athleteStats";
import { GAME_CONFIG } from "./config";
import { nextRandom } from "./random";
import {
  getSocialDoubleFollowerChance,
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
}

export function resolveSocialContentCycles(
  state: GameState,
  cycleCount: number,
): SocialContentOutcome {
  const cycles = Math.max(0, Math.floor(cycleCount));
  if (cycles === 0) {
    return {
      state,
      cycles: 0,
      followersGained: 0,
    };
  }

  let nextSeed = state.randomSeed;
  let followers = state.school.followers;
  let followersGained = 0;
  const followerChance = getSocialFollowerChance(state.upgrades);
  const doubleFollowerChance = getSocialDoubleFollowerChance(state.upgrades);
  for (let index = 0; index < cycles; index += 1) {
    const [followerRoll, seedAfterFollower] = nextRandom(nextSeed);
    nextSeed = seedAfterFollower;
    const gained = followerRoll < doubleFollowerChance
      ? 2
      : followerRoll < followerChance
        ? 1
        : 0;
    followers += gained;
    followersGained += gained;
  }

  const nextState: GameState = {
    ...state,
    randomSeed: nextSeed,
    school: {
      ...state.school,
      followers,
      fame: state.school.fame + followersGained,
    },
    statistics: {
      ...state.statistics,
      socialContentCycles: state.statistics.socialContentCycles + cycles,
      socialFollowersGained:
        state.statistics.socialFollowersGained + followersGained,
    },
  };

  return {
    state: nextState,
    cycles,
    followersGained,
  };
}
