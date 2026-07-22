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
import { nextRandom } from "./random";
import { createSecretLegendaryContact } from "./secretLegendaryRoster";
import { addMessage } from "./stateUpdates";
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

const LEVEL_BY_CALENDAR_MONTH: Partial<Record<number, TournamentLevel>> = {
  12: "school",
  4: "academy",
  6: "national",
  11: "champions",
};

export function compactTournamentHistory(state: GameState): GameState {
  const results = state.tournaments.results.slice(
    -GAME_CONFIG.recentTournamentResultsLimit,
  );
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
  return level === "school" ? year : Math.max(1, year - 1);
}

export function scheduleSecretLegendaryTrial(
  state: GameState,
  id: SecretLegendaryId,
  now: number,
): GameState {
  const profile: SecretLegendaryProfile = SECRET_LEGENDARIES[id];
  if (profile.recruitment === "never" || !profile.schoolId) return state;
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
  const rewardedState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros + euros },
    statistics: {
      ...state.statistics,
      eurosEarned: state.statistics.eurosEarned + euros,
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
  };
  return addMessage(
    rewardedState,
    now,
    `${profile.firstName} ${profile.lastName} mantiene la promessa`,
    `Dopo la sconfitta ha donato € ${euros.toLocaleString("it-IT")} alla scuola. Non chiederà di iscriversi e potrà essere affrontato di nuovo.`,
    "positive",
    "focused",
    "tournaments",
  );
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
  }, now, `${label} non disputato`, reason === "insufficient-members"
    ? `La scuola non ha raggiunto ${GAME_CONFIG.tournamentMinimumMembers} iscritti attivi con Forma 1. La stagione competitiva termina qui.`
    : "Nessun atleta della scuola si è qualificato per questa competizione.",
  "neutral", "focused", "tournaments");
}

function applyTournamentResult(
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
  const chroniclesKeyEarned = didSchoolEarnChroniclesKey(resolvedResult);
  let nextState: GameState = {
    ...state,
    randomSeed: nextSeed,
    contacts: state.contacts.map((contact) => participatingOwnedIds.has(contact.id)
      ? { ...contact, tournamentExperience: (contact.tournamentExperience ?? 0) + 1 }
      : contact),
    tournaments: {
      ...state.tournaments,
      results: [...state.tournaments.results, resolvedResult].slice(
        -GAME_CONFIG.recentTournamentResultsLimit,
      ),
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
      championsVictoryCurrentSchool:
        state.tournaments.championsVictoryCurrentSchool || championOwned,
      chronicles: chroniclesKeyEarned
        ? {
            ...state.tournaments.chronicles,
            unlocked: true,
            keys: state.tournaments.chronicles.keys + 1,
          }
        : state.tournaments.chronicles,
    },
  };
  nextState = applyTournamentRewards(nextState, resolvedResult, now);
  for (const id of resolvedResult.secretLegendaryDefeatedIds) {
    nextState = resolveSecretLegendaryDefeat(nextState, id, now);
  }
  nextState = createChroniclesVictoryChallenge(nextState, resolvedResult, now);
  if (chroniclesKeyEarned) {
    nextState = addMessage(
      nextState,
      now + 1,
      "Chiave delle Chronicles conquistata",
      "La scuola ha vinto Arena e Stile nella stessa Champion's Arena. La chiave può essere usata in qualsiasi momento dalla scheda Chronicles.",
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
    `${ownedQualifierIds.length} atlet${ownedQualifierIds.length === 1 ? "a qualificato" : "i qualificati"}` +
      `${rewardEuros > 0 || rewardDetails.length > 0
        ? `. Premi: € ${rewardEuros.toLocaleString("it-IT")}${rewardDetails.length > 0
          ? ` · ${rewardDetails.join(" · ")}`
          : ""}.`
        : "."}`,
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
  state: GameState,
  absoluteMonth: number,
  now: number,
): GameState {
  if (!isGameAreaUnlocked("tournaments", state)) return state;
  const level = LEVEL_BY_CALENDAR_MONTH[getCalendarMonth(absoluteMonth)];
  if (!level) return state;
  const season = getTournamentSeason(level, absoluteMonth);
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
