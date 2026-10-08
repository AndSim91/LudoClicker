import { formatCurrency, formatList } from "../shared/formatters";
import { addCareer } from "./career";
import {
  SECRET_LEGENDARIES,
  type SecretLegendaryProfile,
} from "../content/secretLegendaries";
import { TOURNAMENT_DEFINITIONS, getNextTournamentLevel } from "../content/tournaments";
import { getGameYear } from "./calendar";
import { createChroniclesVictoryChallenge } from "./chroniclesFlow";
import { GAME_CONFIG } from "./config";
import { makeGameId } from "./ids";
import { isGameAreaUnlocked } from "./progression";
import { unlockTournamentsIfEligible } from "./unlocks";
import { nextRandom } from "./random";
import { createSecretLegendaryContact } from "./secretLegendaryRoster";
import { addMessage } from "./stateUpdates";
import { noteNarrativeEvent } from "./yearDigest";
import { SECRET_DEFEAT_EVENTS } from "../content/narrativeEvents";
import {
  applyTournamentRewards,
  describeTournamentRewardBonus,
  resolveTournamentRewardFallbacks,
} from "./tournamentRewardFlow";
import { getEligibleSchoolContacts, simulateTournament } from "./tournamentSimulation";
import type {
  GameState,
  SecretLegendaryId,
  TournamentLevel,
  TournamentResult,
} from "./types";
import { unlockGadgetSectorFromTournamentResult } from "./gadgetFlow";
import { unlockReptileFromTournamentResult } from "./reptileUnlock";
import {
  compactDetailedTournamentResults,
  replaceTournamentHallEntry,
} from "./tournamentHistory";

const LEVEL_BY_CALENDAR_MONTH: Partial<Record<number, TournamentLevel>> = {
  12: "school",
  4: "academy",
  6: "national",
  11: "champions",
};

export function compactTournamentHistory(state: GameState): GameState {
  const results = compactDetailedTournamentResults(state.tournaments.results);
  const missedTournaments = state.tournaments.missedTournaments.slice(
    -GAME_CONFIG.recentMissedTournamentsLimit,
  );
  const skippedSeasons = state.tournaments.skippedSeasons.slice(
    -GAME_CONFIG.recentMissedTournamentsLimit,
  );
  if (
    results.length === state.tournaments.results.length &&
    missedTournaments.length === state.tournaments.missedTournaments.length &&
    skippedSeasons.length === state.tournaments.skippedSeasons.length
  ) return state;

  return {
    ...state,
    tournaments: {
      ...state.tournaments,
      results,
      missedTournaments,
      skippedSeasons,
    },
  };
}

function getCalendarMonth(absoluteMonth: number): number {
  return ((Math.max(1, absoluteMonth) - 1) % 12) + 1;
}

export function getTournamentSeason(level: TournamentLevel, absoluteMonth: number): number {
  const year = getGameYear(absoluteMonth);
  // Season 0 = the Open tournaments of the first calendar year: nobody can be qualified yet.
  return level === "school" ? year : year - 1;
}

export function scheduleSecretLegendaryTrial(
  state: GameState,
  id: SecretLegendaryId,
  now: number,
): GameState {
  const profile: SecretLegendaryProfile = SECRET_LEGENDARIES[id];
  if (profile.recruitment === "never" || profile.level === "chronicles") return state;
  const progress = state.network.secretLegendaries[id] ?? {
    status: "external",
    defeats: 0,
    failedTrials: 0,
  };
  if (progress.status !== "external") return state;
  const existingContact = state.contacts.find((contact) => contact.secretLegendaryId === id);
  if (
    existingContact?.status === "enrolled" ||
    (existingContact && state.scheduledTrials.some(
      (trial) => trial.contactId === existingContact.id && trial.status === "scheduled",
    ))
  ) return state;
  const contactId = existingContact?.id ?? makeGameId("secret", now, id);
  const [resultSeed, nextSeed] = nextRandom(state.randomSeed);
  const contact = createSecretLegendaryContact(state, id, now, "trialScheduled");
  return {
    ...state,
    randomSeed: nextSeed,
    contacts: existingContact
      ? state.contacts.map((candidate) => candidate.id === contactId ? contact : candidate)
      : [...state.contacts, contact],
    scheduledTrials: [...state.scheduledTrials, {
      id: makeGameId("trial", now, `${id}-${progress.defeats + 1}`),
      contactId,
      startsAt: now,
      resolvesAt: now + GAME_CONFIG.secretLegendaryTrialDurationMs,
      resultSeed,
      status: "scheduled",
      secretLegendaryId: id,
    }],
    legendaryCollaborators: {
      ...state.legendaryCollaborators,
      encounteredProfileIds: state.legendaryCollaborators.encounteredProfileIds.includes(id)
        ? state.legendaryCollaborators.encounteredProfileIds
        : [...state.legendaryCollaborators.encounteredProfileIds, id],
    },
    network: {
      ...state.network,
      secretLegendaries: {
        ...state.network.secretLegendaries,
        [id]: { ...progress, status: "trial", defeats: progress.defeats + 1 },
      },
    },
    statistics: { ...state.statistics, trialsBooked: state.statistics.trialsBooked + 1 },
  };
}

export function resolveSecretLegendaryDefeat(
  state: GameState,
  id: SecretLegendaryId,
  now: number,
): GameState {
  const profile: SecretLegendaryProfile = SECRET_LEGENDARIES[id];
  if (profile.recruitment !== "never") {
    return scheduleSecretLegendaryTrial(state, id, now);
  }

  const progress = state.network.secretLegendaries[id] ?? {
    status: "external",
    defeats: 0,
    failedTrials: 0,
  };
  const euros = profile.defeatRewardEuros ?? 0;
  const event = SECRET_DEFEAT_EVENTS[id as keyof typeof SECRET_DEFEAT_EVENTS];
  const rewardedState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros + euros },
    statistics: {
      ...state.statistics,
      eurosEarned: state.statistics.eurosEarned + euros,
      narrativeEvents: state.statistics.narrativeEvents + (event ? 1 : 0),
    },
    network: {
      ...state.network,
      secretLegendaries: {
        ...state.network.secretLegendaries,
        [id]: {
          ...progress,
          status: "external",
          defeats: progress.defeats + 1,
        },
      },
    },
    // No scene for who never enrolls: an Evento in La mia giornata (08/10).
    narrative: event
      ? {
          ...state.narrative,
          history: [
            ...state.narrative.history,
            {
              id: makeGameId("narrative", now, `${id}-${progress.defeats + 1}`),
              definitionId: event.id,
              title: event.title,
              occurredAt: now,
              summary: event.description,
              effects: { euros: euros || undefined },
            },
          ].slice(-GAME_CONFIG.narrativeHistoryLimit),
        }
      : state.narrative,
  };
  return event ? noteNarrativeEvent(rewardedState, event.title) : rewardedState;
}

function recordMissedTournament(
  state: GameState,
  level: TournamentLevel,
  season: number,
  reason: "insufficient-members" | "not-qualified",
  now: number,
): GameState {
  const label = TOURNAMENT_DEFINITIONS[level].label;
  const skippedSeasons = reason === "insufficient-members" &&
    !state.tournaments.skippedSeasons.includes(season)
    ? [...state.tournaments.skippedSeasons, season].slice(
        -GAME_CONFIG.recentMissedTournamentsLimit,
      )
    : state.tournaments.skippedSeasons;
  return addMessage({
    ...state,
    tournaments: {
      ...state.tournaments,
      qualification: undefined,
      immuneContactIds: [],
      skippedSeasons,
      missedTournaments: [
        ...state.tournaments.missedTournaments,
        { level, season, reason },
      ].slice(-GAME_CONFIG.recentMissedTournamentsLimit),
    },
  }, now, `${label} saltato`, reason === "insufficient-members"
    ? `Servono ${GAME_CONFIG.tournamentMinimumMembers} iscritti con almeno Forma 1. Per quest'anno l'Accademico lo guarderemo dagli spalti.`
    : "Nessuno dei nostri si è qualificato. Si tifa dagli spalti quest'anno.",
  "neutral", "focused", "tournaments");
}

export function applyTournamentResult(
  state: GameState,
  result: TournamentResult,
  nextSeed: number,
  now: number,
): GameState {
  const resolvedResult = resolveTournamentRewardFallbacks(state, result, now);
  const nextLevel = getNextTournamentLevel(resolvedResult.level);
  const ownedQualifierIds = resolvedResult.qualifiers.flatMap((qualifier) =>
    qualifier.ownedContactId ? [qualifier.ownedContactId] : []
  );
  const participatingOwnedIds = new Set(resolvedResult.participants.flatMap((participant) =>
    participant.ownedContactId ? [participant.ownedContactId] : []
  ));
  const arenaWinner = resolvedResult.participants.find(
    (entry) => entry.id === resolvedResult.arenaRanking[0],
  );
  const styleWinner = resolvedResult.participants.find(
    (entry) => entry.id === resolvedResult.styleRanking[0],
  );
  const championOwned = resolvedResult.level === "champions" &&
    Boolean(arenaWinner?.ownedContactId || styleWinner?.ownedContactId);
  const academyOwned = resolvedResult.level === "academy" &&
    Boolean(arenaWinner?.ownedContactId || styleWinner?.ownedContactId);
  const nationalOwned = resolvedResult.level === "national" &&
    Boolean(arenaWinner?.ownedContactId || styleWinner?.ownedContactId);
  const chroniclesOwned = resolvedResult.level === "chronicles" &&
    Boolean(arenaWinner?.ownedContactId || styleWinner?.ownedContactId);
  const ordinaryTournamentWon = didSchoolWinOrdinaryTournament(resolvedResult);
  const chroniclesKeyEarned = didSchoolEarnChroniclesKey(resolvedResult);
  let nextState: GameState = {
    ...state,
    randomSeed: nextSeed,
    contacts: state.contacts.map((contact) => participatingOwnedIds.has(contact.id)
      ? { ...contact, tournamentExperience: (contact.tournamentExperience ?? 0) + 1 }
      : contact),
    tournaments: {
      ...state.tournaments,
      results: compactDetailedTournamentResults([
        ...state.tournaments.results,
        resolvedResult,
      ]),
      hall: replaceTournamentHallEntry(state.tournaments.hall, resolvedResult),
      qualification: nextLevel && ownedQualifierIds.length > 0
        ? {
            level: nextLevel as Exclude<TournamentLevel, "school">,
            season: resolvedResult.season,
            contactIds: ownedQualifierIds,
            slotCount: resolvedResult.qualificationAllocation?.slotCount,
            activeMembersAtQualification:
              resolvedResult.qualificationAllocation?.activeMembers,
          }
        : undefined,
      immuneContactIds: nextLevel ? ownedQualifierIds : [],
      ordinaryVictoryAchieved:
        state.tournaments.ordinaryVictoryAchieved || ordinaryTournamentWon,
      championsVictoryCurrentSchool:
        state.tournaments.championsVictoryCurrentSchool || championOwned,
      academyTitlesCurrentSchool:
        (state.tournaments.academyTitlesCurrentSchool ?? 0) + (academyOwned ? 1 : 0),
      nationalTitlesCurrentSchool:
        (state.tournaments.nationalTitlesCurrentSchool ?? 0) + (nationalOwned ? 1 : 0),
      ...(state.tournaments.chroniclesVictoryCurrentSchool || chroniclesOwned
        ? { chroniclesVictoryCurrentSchool: true }
        : {}),
      chronicles: chroniclesKeyEarned
        ? {
            ...state.tournaments.chronicles,
            unlocked: true,
            keys: state.tournaments.chronicles.keys + 1,
          }
        : state.tournaments.chronicles,
    },
  };
  nextState = addCareer(nextState, {
    nationalTitles: nationalOwned ? 1 : 0,
    championsWins: championOwned ? 1 : 0,
    chroniclesWins: chroniclesOwned ? 1 : 0,
  });
  nextState = unlockGadgetSectorFromTournamentResult(
    nextState,
    resolvedResult,
    now,
  );
  nextState = unlockReptileFromTournamentResult(nextState, resolvedResult, now);
  nextState = applyTournamentRewards(nextState, resolvedResult, now);
  for (const id of resolvedResult.secretLegendaryDefeatedIds) {
    nextState = resolveSecretLegendaryDefeat(nextState, id, now);
  }
  nextState = createChroniclesVictoryChallenge(nextState, resolvedResult, now);
  if (chroniclesKeyEarned) {
    nextState = addMessage(
      nextState,
      now + 1,
      "La chiave delle Chronicles",
      "Arena e Stile nella stessa Champion's Arena: la porta è aperta. La chiave non scade, usala quando vuoi dalla scheda Chronicles.",
      "positive",
      "focused",
      "tournaments",
    );
  }
  const label = TOURNAMENT_DEFINITIONS[resolvedResult.level].label;
  const rewardEuros = resolvedResult.rewards.reduce(
    (total, reward) => total + reward.euros,
    0,
  );
  const rewardDetails = resolvedResult.rewards
    .map(describeTournamentRewardBonus)
    .filter((description) => description !== "Nessun bonus aggiuntivo");
  return addMessage(
    nextState,
    now,
    `${label} completato`,
    `${ownedQualifierIds.length === 1 ? "Uno dei nostri" : `${ownedQualifierIds.length} dei nostri`} in gara.` +
      (rewardEuros > 0 || rewardDetails.length > 0
        ? ` Si torna a casa con ${formatList([...(rewardEuros > 0 ? [formatCurrency(rewardEuros)] : []), ...rewardDetails])}.`
        : ""),
    ownedQualifierIds.length > 0 || championOwned ? "positive" : "neutral",
    "focused",
    "tournaments",
  );
}

export function didSchoolEarnChroniclesKey(result: TournamentResult): boolean {
  if (result.level !== "champions") return false;
  const arenaWinner = result.participants.find(
    (participant) => participant.id === result.arenaRanking[0],
  );
  const styleWinner = result.participants.find(
    (participant) => participant.id === result.styleRanking[0],
  );
  return Boolean(arenaWinner?.ownedContactId && styleWinner?.ownedContactId);
}

export function didSchoolWinOrdinaryTournament(result: TournamentResult): boolean {
  if (result.level === "school" || result.level === "chronicles") return false;
  const arenaWinner = result.participants.find(
    (participant) => participant.id === result.arenaRanking[0],
  );
  const styleWinner = result.participants.find(
    (participant) => participant.id === result.styleRanking[0],
  );
  return Boolean(arenaWinner?.ownedContactId || styleWinner?.ownedContactId);
}

export function startChroniclesTournament(
  state: GameState,
  contactIds: readonly string[],
  now: number,
): GameState {
  const uniqueIds = [...new Set(contactIds)];
  const chronicles = state.tournaments.chronicles;
  if (
    !chronicles.unlocked ||
    chronicles.keys <= 0 ||
    chronicles.activeChallenge ||
    uniqueIds.length !== GAME_CONFIG.chroniclesTeamSize
  ) return state;
  const eligibleById = new Map(
    getEligibleSchoolContacts(state).map((contact) => [contact.id, contact]),
  );
  const team = uniqueIds.flatMap((id) => {
    const contact = eligibleById.get(id);
    return contact ? [contact] : [];
  });
  if (team.length !== GAME_CONFIG.chroniclesTeamSize) return state;

  const paidState: GameState = {
    ...state,
    tournaments: {
      ...state.tournaments,
      chronicles: { ...chronicles, keys: chronicles.keys - 1 },
    },
  };
  const season = getGameYear(state.school.currentMonth);
  const simulation = simulateTournament(paidState, "chronicles", season, now, team);
  return applyTournamentResult(
    paidState,
    simulation.result,
    simulation.nextSeed,
    now,
  );
}

export function processTournamentAtMonthEnd(
  current: GameState,
  absoluteMonth: number,
  now: number,
): GameState {
  // The 8th athlete may earn Forma 1 in the December tick itself: Tornei opens before the check.
  const state = unlockTournamentsIfEligible(current, now);
  if (!isGameAreaUnlocked("tournaments", state)) return state;
  const level = LEVEL_BY_CALENDAR_MONTH[getCalendarMonth(absoluteMonth)];
  if (!level) return state;
  const season = getTournamentSeason(level, absoluteMonth);
  if (season < 1) return state;
  if (
    state.tournaments.results.some((result) => result.level === level && result.season === season) ||
    state.tournaments.missedTournaments.some((entry) => entry.level === level && entry.season === season)
  ) return state;

  if (level === "school") {
    const eligible = getEligibleSchoolContacts(state);
    if (eligible.length < GAME_CONFIG.tournamentMinimumMembers) {
      return recordMissedTournament(state, level, season, "insufficient-members", now);
    }
    const simulation = simulateTournament(state, level, season, now, eligible);
    return applyTournamentResult(state, simulation.result, simulation.nextSeed, now);
  }

  const qualification = state.tournaments.qualification;
  if (!qualification || qualification.level !== level || qualification.season !== season) {
    return recordMissedTournament(state, level, season, "not-qualified", now);
  }
  const contactsById = new Map(state.contacts.map((contact) => [contact.id, contact]));
  const ownedContacts = qualification.contactIds.flatMap((id) => {
    const contact = contactsById.get(id);
    return contact?.status === "enrolled" ? [contact] : [];
  });
  const vacantQualificationContactIds = qualification.contactIds.filter(
    (id) => contactsById.get(id)?.status !== "enrolled",
  );
  const simulation = simulateTournament(state, level, season, now, ownedContacts, {
    vacantQualificationContactIds,
  });
  return applyTournamentResult(state, simulation.result, simulation.nextSeed, now);
}
