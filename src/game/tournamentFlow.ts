import { SECRET_LEGENDARIES, TOURNAMENT_DEFINITIONS, getNextTournamentLevel } from "../content/tournaments";
import { createAcquiredContacts, addLegendaryEncounters } from "./contacts";
import { getGameYear } from "./calendar";
import { GAME_CONFIG } from "./config";
import { makeGameId } from "./ids";
import { nextRandom } from "./random";
import { addMessage } from "./stateUpdates";
import { getEligibleSchoolContacts, simulateTournament } from "./tournamentSimulation";
import type {
  Contact,
  FormId,
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

function getCalendarMonth(absoluteMonth: number): number {
  return ((Math.max(1, absoluteMonth) - 1) % 12) + 1;
}

export function getTournamentSeason(level: TournamentLevel, absoluteMonth: number): number {
  const year = getGameYear(absoluteMonth);
  return level === "school" ? year : Math.max(1, year - 1);
}

function getCanonicalSecretForms(numericForms: number): FormId[] {
  const result: FormId[] = ["form-1"];
  if (numericForms >= 2) result.push("course-x", "form-2");
  if (numericForms >= 3) result.push("course-y", "form-3-long");
  if (numericForms >= 4) result.push("form-4-long");
  if (numericForms >= 5) result.push("form-5-long");
  if (numericForms >= 6) result.push("form-6");
  if (numericForms >= 7) result.push("form-7");
  return result;
}

export function scheduleSecretLegendaryTrial(
  state: GameState,
  id: SecretLegendaryId,
  now: number,
): GameState {
  const progress = state.network.secretLegendaries[id];
  if (progress.status !== "external") return state;
  const profile = SECRET_LEGENDARIES[id];
  const contactId = makeGameId("secret", now, id);
  const [resultSeed, nextSeed] = nextRandom(state.randomSeed);
  const contact: Contact = {
    id: contactId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: `${id}@incontro.torneo`,
    source: "tournament",
    acquiredAt: now,
    status: "trialScheduled",
    rarity: "legendary",
    specialProfileId: id,
    secretLegendaryId: id,
    forms: getCanonicalSecretForms(profile.numericForms),
    formBranchPreferences: ["Spada Lunga"],
    arenaBase: profile.arenaBase,
    styleBase: profile.styleBase,
    tournamentExperience: profile.externalExperience,
  };
  return {
    ...state,
    randomSeed: nextSeed,
    contacts: [...state.contacts, contact],
    scheduledTrials: [...state.scheduledTrials, {
      id: makeGameId("trial", now, id),
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

function applyTournamentRewards(state: GameState, result: TournamentResult, now: number): GameState {
  const euros = result.rewards.reduce((total, reward) => total + reward.euros, 0);
  const contactCount = result.rewards.reduce((total, reward) => total + reward.contacts, 0);
  let nextState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros + euros },
    statistics: { ...state.statistics, eurosEarned: state.statistics.eurosEarned + euros },
  };
  if (contactCount === 0) return nextState;
  const acquired = createAcquiredContacts(nextState, contactCount, "tournament", now);
  nextState = {
    ...nextState,
    randomSeed: acquired.nextSeed,
    contacts: [...nextState.contacts, ...acquired.contacts],
    legendaryCollaborators: addLegendaryEncounters(nextState.legendaryCollaborators, acquired.contacts),
    statistics: {
      ...nextState.statistics,
      contactsAcquired: nextState.statistics.contactsAcquired + contactCount,
    },
  };
  return nextState;
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
    ? [...state.tournaments.skippedSeasons, season]
    : state.tournaments.skippedSeasons;
  return addMessage({
    ...state,
    tournaments: {
      ...state.tournaments,
      qualification: undefined,
      immuneContactIds: [],
      skippedSeasons,
      missedTournaments: [...state.tournaments.missedTournaments, { level, season, reason }],
    },
  }, now, `${label} non disputato`, reason === "insufficient-members"
    ? "La scuola non ha raggiunto dieci iscritti attivi con Forma 1. La stagione competitiva termina qui."
    : "Nessun atleta della scuola si è qualificato per questa competizione.",
  "neutral", "focused", "tournaments");
}

function applyTournamentResult(
  state: GameState,
  result: TournamentResult,
  nextSeed: number,
  now: number,
): GameState {
  const nextLevel = getNextTournamentLevel(result.level);
  const ownedQualifierIds = result.qualifiers.flatMap((qualifier) =>
    qualifier.ownedContactId ? [qualifier.ownedContactId] : []
  );
  const participatingOwnedIds = new Set(result.participants.flatMap((participant) =>
    participant.ownedContactId ? [participant.ownedContactId] : []
  ));
  const arenaWinner = result.participants.find((entry) => entry.id === result.arenaRanking[0]);
  const styleWinner = result.participants.find((entry) => entry.id === result.styleRanking[0]);
  const championOwned = result.level === "champions" &&
    Boolean(arenaWinner?.ownedContactId || styleWinner?.ownedContactId);
  let nextState: GameState = {
    ...state,
    randomSeed: nextSeed,
    contacts: state.contacts.map((contact) => participatingOwnedIds.has(contact.id)
      ? { ...contact, tournamentExperience: (contact.tournamentExperience ?? 0) + 1 }
      : contact),
    tournaments: {
      ...state.tournaments,
      results: [...state.tournaments.results, result],
      qualification: nextLevel && ownedQualifierIds.length > 0
        ? {
            level: nextLevel as Exclude<TournamentLevel, "school">,
            season: result.season,
            contactIds: ownedQualifierIds,
          }
        : undefined,
      immuneContactIds: nextLevel ? ownedQualifierIds : [],
      championsVictoryCurrentSchool:
        state.tournaments.championsVictoryCurrentSchool || championOwned,
    },
  };
  nextState = applyTournamentRewards(nextState, result, now);
  for (const id of result.secretLegendaryDefeatedIds) {
    nextState = scheduleSecretLegendaryTrial(nextState, id, now);
  }
  const label = TOURNAMENT_DEFINITIONS[result.level].label;
  const rewardEuros = result.rewards.reduce((total, reward) => total + reward.euros, 0);
  const rewardContacts = result.rewards.reduce((total, reward) => total + reward.contacts, 0);
  return addMessage(
    nextState,
    now,
    `${label} completato`,
    `${ownedQualifierIds.length} atlet${ownedQualifierIds.length === 1 ? "a qualificato" : "i qualificati"}` +
      `${rewardEuros > 0 || rewardContacts > 0
        ? `. Premi: € ${rewardEuros.toLocaleString("it-IT")} e ${rewardContacts} contatti.`
        : "."}`,
    ownedQualifierIds.length > 0 || championOwned ? "positive" : "neutral",
    "focused",
    "tournaments",
  );
}

export function processTournamentAtMonthEnd(
  state: GameState,
  absoluteMonth: number,
  now: number,
): GameState {
  const level = LEVEL_BY_CALENDAR_MONTH[getCalendarMonth(absoluteMonth)];
  if (!level) return state;
  const season = getTournamentSeason(level, absoluteMonth);
  if (
    state.tournaments.results.some((result) => result.level === level && result.season === season) ||
    state.tournaments.missedTournaments.some((entry) => entry.level === level && entry.season === season)
  ) return state;

  if (level === "school") {
    const eligible = getEligibleSchoolContacts(state);
    if (eligible.length < 10) {
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
  if (ownedContacts.length === 0) {
    return recordMissedTournament(state, level, season, "not-qualified", now);
  }
  const simulation = simulateTournament(state, level, season, now, ownedContacts);
  return applyTournamentResult(state, simulation.result, simulation.nextSeed, now);
}
